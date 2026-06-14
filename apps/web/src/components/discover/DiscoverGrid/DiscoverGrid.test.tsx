import { describe, expect, it, vi } from 'vitest';
import { render } from '@/test/test-utils';
import type { DiscoverMedia } from '@/stores/useDiscoverStore';
import DiscoverGrid from './DiscoverGrid';

const items: DiscoverMedia[] = [
  { id: 1, title: { english: 'Frieren' }, coverImage: { large: 'cover.jpg' } },
];

describe('DiscoverGrid', () => {
  it('renders its scroll container without crashing', () => {
    const { container } = render(
      <DiscoverGrid
        items={items}
        libraryIds={new Set<number>()}
        hasNextPage={false}
        isLoadingMore={false}
        onLoadMore={vi.fn()}
        onCardClick={vi.fn()}
        onAddToLibrary={vi.fn()}
      />
    );

    expect(container.querySelector('.h-full.w-full')).toBeInTheDocument();
  });
});
