import type { Meta, StoryObj } from '@storybook/react-vite';
import type { AniListCommunityRecommendation } from '@shiroani/shared';
import { useDiscoverStore } from '@/stores/useDiscoverStore';
import RecommendationsPanel from './RecommendationsPanel';

const recommendations: AniListCommunityRecommendation[] = Array.from({ length: 6 }, (_, i) => ({
  id: i + 1,
  rating: 10 * (i + 1),
  userRating: 'NO_RATING',
  media: { id: 100 + i, title: { english: `Source ${i + 1}` } },
  mediaRecommendation: {
    id: 200 + i,
    title: { english: `Recommended ${i + 1}` },
    coverImage: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/nx154587.jpg',
    format: 'TV',
    averageScore: 80 + i,
  },
}));

const meta = {
  title: 'discover/RecommendationsPanel',
  component: RecommendationsPanel,
} satisfies Meta<typeof RecommendationsPanel>;

export default meta;

type Story = StoryObj<typeof RecommendationsPanel>;

export const Default: Story = {
  beforeEach: () => {
    useDiscoverStore.setState({
      recommendations,
      isRecommendationsLoading: false,
      recommendationsError: null,
      votingIds: new Set<number>(),
    });
  },
  args: {
    libraryIds: new Set<number>([200]),
    connected: true,
    onCardClick: () => {},
  },
};
