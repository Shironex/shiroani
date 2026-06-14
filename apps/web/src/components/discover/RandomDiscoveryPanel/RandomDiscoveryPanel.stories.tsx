import type { Meta, StoryObj } from '@storybook/react-vite';
import type { DiscoverMedia } from '@/stores/useDiscoverStore';
import { useDiscoverStore } from '@/stores/useDiscoverStore';
import RandomDiscoveryPanel from './RandomDiscoveryPanel';

const pool: DiscoverMedia[] = Array.from({ length: 4 }, (_, i) => ({
  id: i + 1,
  title: { english: `Pick ${i + 1}`, romaji: `Pikku ${i + 1}` },
  coverImage: {
    extraLarge: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/nx154587.jpg',
    medium: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/nx154587.jpg',
  },
  episodes: 12,
  genres: ['Adventure', 'Fantasy'],
  averageScore: 80 + i,
}));

const meta = {
  title: 'discover/RandomDiscoveryPanel',
  component: RandomDiscoveryPanel,
} satisfies Meta<typeof RandomDiscoveryPanel>;

export default meta;

type Story = StoryObj<typeof RandomDiscoveryPanel>;

export const Default: Story = {
  beforeEach: () => {
    useDiscoverStore.setState({
      randomShuffled: pool,
      randomIncludedGenres: [],
      randomExcludedGenres: [],
      isRandomLoading: false,
      error: null,
    });
  },
  args: {
    libraryIds: new Set<number>([2]),
    excludedIds: new Set<number>(),
    onCardClick: () => {},
    onError: () => {},
  },
};
