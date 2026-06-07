import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LibraryEvents, type AnimeEntry, type AnimeStatus } from '@shiroani/shared';

const { emitWithErrorHandling, getSocket } = vi.hoisted(() => ({
  emitWithErrorHandling: vi.fn(),
  getSocket: vi.fn(() => ({ on: vi.fn(), off: vi.fn(), recovered: false })),
}));

vi.mock('@/lib/socket', () => ({ emitWithErrorHandling, getSocket }));

import { useLibraryStore } from '../useLibraryStore';

function makeEntry(id: number, overrides: Partial<AnimeEntry> = {}): AnimeEntry {
  return {
    id,
    title: `Anime ${id}`,
    status: 'watching' as AnimeStatus,
    currentEpisode: 0,
    addedAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

/**
 * Regression for the WS-throttler bug: the batch action bar used to fire ONE
 * socket emit per selected id, so a large selection tripped the 100/s,
 * 500/10s throttler and the batch silently failed. These pin the fix at the
 * call site that broke (the store actions) — 150 selected entries (above the
 * 100/s limit) must produce exactly ONE batched emit, regardless of size.
 */
describe('useLibraryStore — bulk actions fire a single batched emit', () => {
  const SELECTION_SIZE = 150;

  beforeEach(() => {
    emitWithErrorHandling.mockReset();
    emitWithErrorHandling.mockResolvedValue({});
    const entries = Array.from({ length: SELECTION_SIZE }, (_, i) => makeEntry(i + 1));
    useLibraryStore.setState({
      entries,
      selectedIds: new Set(entries.map(e => e.id)),
      selectionMode: true,
      selectedEntry: null,
      isDetailOpen: false,
    });
  });

  it('batchRemove emits REMOVE_MANY exactly once with every selected id', () => {
    useLibraryStore.getState().batchRemove();

    expect(emitWithErrorHandling).toHaveBeenCalledTimes(1);
    const [event, payload] = emitWithErrorHandling.mock.calls[0];
    expect(event).toBe(LibraryEvents.REMOVE_MANY);
    expect((payload as { ids: number[] }).ids).toHaveLength(SELECTION_SIZE);
    // Optimistically removed + selection cleared.
    expect(useLibraryStore.getState().entries).toHaveLength(0);
    expect(useLibraryStore.getState().selectedIds.size).toBe(0);
    expect(useLibraryStore.getState().selectionMode).toBe(false);
  });

  it('batchUpdateStatus emits UPDATE_MANY exactly once carrying the status', () => {
    useLibraryStore.getState().batchUpdateStatus('completed');

    expect(emitWithErrorHandling).toHaveBeenCalledTimes(1);
    const [event, payload] = emitWithErrorHandling.mock.calls[0];
    expect(event).toBe(LibraryEvents.UPDATE_MANY);
    expect(payload).toMatchObject({ status: 'completed' });
    expect((payload as { ids: number[] }).ids).toHaveLength(SELECTION_SIZE);
    // Every row optimistically patched.
    expect(useLibraryStore.getState().entries.every(e => e.status === 'completed')).toBe(true);
  });

  it('batchUpdateScore emits UPDATE_MANY exactly once (score 0 = clear sent through)', () => {
    useLibraryStore.getState().batchUpdateScore(0);

    expect(emitWithErrorHandling).toHaveBeenCalledTimes(1);
    const [event, payload] = emitWithErrorHandling.mock.calls[0];
    expect(event).toBe(LibraryEvents.UPDATE_MANY);
    // 0 is sent explicitly (not stripped to undefined) so SQLite clears the score.
    expect(payload).toMatchObject({ score: 0 });
    expect((payload as { ids: number[] }).ids).toHaveLength(SELECTION_SIZE);
  });
});
