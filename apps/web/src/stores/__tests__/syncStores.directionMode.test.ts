import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AniListSyncEvents, MalSyncEvents, type SyncResult } from '@shiroani/shared';

// The sync stores reach the desktop over `@/lib/socket`. Mock it so we can assert
// the exact full-sync payload each direction mode emits without a real socket.
const { emitMock } = vi.hoisted(() => ({ emitMock: vi.fn() }));
vi.mock('@/lib/socket', () => ({
  getSocket: vi.fn(() => ({ on: vi.fn(), off: vi.fn() })),
  emitWithErrorHandling: emitMock,
}));

import { useAniListSyncStore } from '../useAniListSyncStore';
import { useMalSyncStore } from '../useMalSyncStore';

const EMPTY_RESULT: SyncResult = {
  imported: 0,
  pushedNew: 0,
  updatedLocal: 0,
  updatedRemote: 0,
  unchanged: 0,
  conflicts: 0,
  skippedNoId: 0,
  errors: 0,
};

const PROVIDERS = [
  {
    name: 'AniList',
    store: useAniListSyncStore,
    event: AniListSyncEvents.SYNC,
    persistKey: 'anilist-sync-prefs',
  },
  { name: 'MAL', store: useMalSyncStore, event: MalSyncEvents.SYNC, persistKey: 'mal-sync-prefs' },
] as const;

describe.each(PROVIDERS)('$name sync store — direction mode', ({ store, event, persistKey }) => {
  beforeEach(() => {
    emitMock.mockReset();
    emitMock.mockResolvedValue(EMPTY_RESULT);
    localStorage.clear();
    store.setState({
      syncing: false,
      progress: null,
      result: null,
      lastSyncedAt: null,
      error: null,
      entrySyncingId: null,
      directionMode: 'two-way',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('defaults to two-way', () => {
    expect(store.getState().directionMode).toBe('two-way');
  });

  it('sync() in two-way mode emits a two-way request', async () => {
    await store.getState().sync();
    expect(emitMock).toHaveBeenCalledWith(event, { direction: 'two-way' }, expect.anything());
  });

  it('sync() in push mode emits push + overwrite (mirror local onto remote)', async () => {
    store.getState().setDirectionMode('push');
    await store.getState().sync();
    expect(emitMock).toHaveBeenCalledWith(
      event,
      { direction: 'push', pushMode: 'overwrite' },
      expect.anything()
    );
  });

  it('sync() in pull mode emits a pull request', async () => {
    store.getState().setDirectionMode('pull');
    await store.getState().sync();
    expect(emitMock).toHaveBeenCalledWith(event, { direction: 'pull' }, expect.anything());
  });

  it('pushLibrary(create-missing) emits push + create-missing regardless of mode', async () => {
    store.getState().setDirectionMode('two-way');
    await store.getState().pushLibrary('create-missing');
    expect(emitMock).toHaveBeenCalledWith(
      event,
      { direction: 'push', pushMode: 'create-missing' },
      expect.anything()
    );
  });

  it('pushLibrary(overwrite) emits push + overwrite', async () => {
    await store.getState().pushLibrary('overwrite');
    expect(emitMock).toHaveBeenCalledWith(
      event,
      { direction: 'push', pushMode: 'overwrite' },
      expect.anything()
    );
  });

  it('single-flight: sync() is a no-op while a sync is already in flight', async () => {
    store.setState({ syncing: true });
    await store.getState().sync();
    expect(emitMock).not.toHaveBeenCalled();
  });

  it('persists ONLY directionMode (transient run state never reaches storage)', () => {
    store.getState().setDirectionMode('push');
    const persisted = JSON.parse(localStorage.getItem(persistKey) ?? '{}');
    expect(persisted.state).toEqual({ directionMode: 'push' });
    // A stuck `syncing: true` rehydrated from disk would render the card frozen.
    expect(persisted.state).not.toHaveProperty('syncing');
  });
});
