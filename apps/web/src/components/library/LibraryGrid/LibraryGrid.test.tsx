import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render } from '@/test/test-utils';
import type { AnimeEntry } from '@shiroani/shared';
import { useLibraryStore } from '@/stores/useLibraryStore';
import LibraryGrid from './LibraryGrid';

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

describe('LibraryGrid', () => {
  beforeEach(() => {
    useLibraryStore.setState({ selectionMode: false, selectedIds: new Set() });
  });

  it('renders the measuring container without crashing', () => {
    // jsdom reports clientWidth 0, so the Grid itself gates off — but the
    // measuring container must always mount so the ResizeObserver can attach.
    const { container } = render(
      <LibraryGrid
        entries={[makeEntry(1), makeEntry(2)]}
        nextAiringMap={new Map()}
        onSelect={vi.fn()}
        onContinue={vi.fn()}
        onRemove={vi.fn()}
      />
    );
    expect(container.querySelector('.h-full.w-full')).toBeInTheDocument();
  });
});
