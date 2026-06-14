import type { Meta, StoryObj } from '@storybook/react-vite';
import type { DiscoverMedia } from '@/stores/useDiscoverStore';
import DiscoverGrid from './DiscoverGrid';

const items: DiscoverMedia[] = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  title: { english: `Anime ${i + 1}` },
  coverImage: {
    large: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/nx154587.jpg',
  },
  episodes: 12,
  averageScore: 80,
}));

const meta = {
  title: 'discover/DiscoverGrid',
  component: DiscoverGrid,
  render: args => (
    <div style={{ height: '70vh' }}>
      <DiscoverGrid {...args} />
    </div>
  ),
} satisfies Meta<typeof DiscoverGrid>;

export default meta;

type Story = StoryObj<typeof DiscoverGrid>;

export const Default: Story = {
  args: {
    items,
    libraryIds: new Set<number>([2]),
    hasNextPage: false,
    isLoadingMore: false,
    onLoadMore: () => {},
    onCardClick: () => {},
    onAddToLibrary: () => {},
  },
};
