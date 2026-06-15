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

function makeEntries(count: number): AnimeEntry[] {
  return Array.from({ length: count }, (_, i) => makeEntry(i + 1));
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

  it('mounts the measuring container for zero entries', () => {
    const { container } = render(
      <LibraryGrid
        entries={[]}
        nextAiringMap={new Map()}
        onSelect={vi.fn()}
        onContinue={vi.fn()}
        onRemove={vi.fn()}
      />
    );
    expect(container.querySelector('.h-full.w-full')).toBeInTheDocument();
  });

  it('mounts the measuring container for a large library without crashing', () => {
    const { container } = render(
      <LibraryGrid
        entries={makeEntries(500)}
        nextAiringMap={new Map()}
        onSelect={vi.fn()}
        onContinue={vi.fn()}
        onRemove={vi.fn()}
      />
    );
    expect(container.querySelector('.h-full.w-full')).toBeInTheDocument();
  });

  it('renders no react-window cells in jsdom because clientWidth is 0 (grid gated off)', () => {
    // The real card rendering (click → onSelect, selection toggle) is covered by
    // the Storybook play test, where the container has a measured width.
    const { container } = render(
      <LibraryGrid
        entries={makeEntries(12)}
        nextAiringMap={new Map()}
        onSelect={vi.fn()}
        onContinue={vi.fn()}
        onRemove={vi.fn()}
      />
    );
    // No AnimeCard renders → no card buttons, no titles.
    expect(container.querySelector('button')).toBeNull();
    expect(container.textContent).not.toContain('Anime #1');
    // The measuring container is the sole child; the gated Grid renders nothing.
    const measure = container.querySelector('.h-full.w-full');
    expect(measure).toBeInTheDocument();
    expect(measure?.childElementCount).toBe(0);
  });
});
