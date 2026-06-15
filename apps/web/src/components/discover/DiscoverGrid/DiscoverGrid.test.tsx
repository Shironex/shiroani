import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@/test/test-utils';
import type { DiscoverMedia } from '@/stores/useDiscoverStore';
import DiscoverGrid from './DiscoverGrid';

const items: DiscoverMedia[] = Array.from({ length: 6 }, (_, i) => ({
  id: i + 1,
  title: { english: `Anime ${i + 1}` },
  coverImage: { large: 'cover.jpg' },
}));

function renderGrid(overrides: Partial<Parameters<typeof DiscoverGrid>[0]> = {}) {
  const handlers = {
    onLoadMore: vi.fn(),
    onCardClick: vi.fn(),
    onAddToLibrary: vi.fn(),
  };
  const result = render(
    <div style={{ width: 800, height: 600 }}>
      <DiscoverGrid
        items={items}
        libraryIds={new Set<number>()}
        hasNextPage={false}
        isLoadingMore={false}
        {...handlers}
        {...overrides}
      />
    </div>
  );
  return { ...result, ...handlers };
}

// react-window measures the container via clientWidth/ResizeObserver; jsdom
// reports 0, so stub a non-zero width to let the grid render its cells.
beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(800);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('DiscoverGrid', () => {
  it('renders its scroll container without crashing', () => {
    const { container } = renderGrid();

    expect(container.querySelector('.h-full.w-full')).toBeInTheDocument();
  });

  it('renders a card per seeded item', () => {
    renderGrid();

    expect(screen.getByRole('button', { name: 'Anime 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Anime 6' })).toBeInTheDocument();
  });

  it('fires onCardClick with the media when a card is activated', async () => {
    const { user, onCardClick } = renderGrid();

    await user.click(screen.getByRole('button', { name: 'Anime 1' }));

    expect(onCardClick).toHaveBeenCalledWith(items[0]);
  });

  it('marks a card already in the library', () => {
    renderGrid({ libraryIds: new Set([2]) });

    // Card 2 renders its add overlay as already-added.
    expect(screen.getByRole('button', { name: 'In library' })).toBeInTheDocument();
  });
});
