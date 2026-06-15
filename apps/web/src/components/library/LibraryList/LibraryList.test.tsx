import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test/test-utils';
import type { AnimeEntry } from '@shiroani/shared';
import { useLibraryStore } from '@/stores/useLibraryStore';
import LibraryList from './LibraryList';

function makeEntry(id: number): AnimeEntry {
  return {
    id,
    title: `Anime #${id}`,
    status: 'watching',
    currentEpisode: 1,
    episodes: 12,
    score: 7,
    addedAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-06-01T00:00:00Z',
  };
}

describe('LibraryList', () => {
  beforeEach(() => {
    useLibraryStore.setState({ selectionMode: false, selectedIds: new Set() });
  });

  it('renders rows for the provided entries', () => {
    render(
      <LibraryList
        entries={[makeEntry(1), makeEntry(2)]}
        nextAiringMap={new Map()}
        onSelect={vi.fn()}
      />
    );
    expect(screen.getByText('Anime #1')).toBeInTheDocument();
    expect(screen.getByText('Anime #2')).toBeInTheDocument();
  });

  it('calls onSelect with the entry when a row is clicked (normal mode)', async () => {
    const onSelect = vi.fn();
    const entries = [makeEntry(1), makeEntry(2)];
    const { user } = render(
      <LibraryList entries={entries} nextAiringMap={new Map()} onSelect={onSelect} />
    );
    // In normal mode each row is a role="button" (LibraryListItem).
    await user.click(screen.getByRole('button', { name: /Anime #1/ }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(entries[0]);
  });

  it('toggles store selection instead of calling onSelect in selection mode', async () => {
    useLibraryStore.setState({ selectionMode: true, selectedIds: new Set() });
    const onSelect = vi.fn();
    const entries = [makeEntry(1), makeEntry(2)];
    const { user } = render(
      <LibraryList entries={entries} nextAiringMap={new Map()} onSelect={onSelect} />
    );
    // In selection mode the row is a role="checkbox" and toggles store selection.
    await user.click(screen.getByRole('checkbox', { name: /Anime #1/ }));
    expect(onSelect).not.toHaveBeenCalled();
    expect(useLibraryStore.getState().selectedIds.has(1)).toBe(true);
  });

  it('renders no entry rows when entries is empty (only the dock-clearance spacer)', () => {
    render(<LibraryList entries={[]} nextAiringMap={new Map()} onSelect={vi.fn()} />);
    // No interactive rows render; the trailing spacer row carries no role.
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByText(/Anime #/)).not.toBeInTheDocument();
  });
});
