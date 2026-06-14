import type { Meta, StoryObj } from '@storybook/react-vite';
import type { AniListCommunityRecommendation } from '@shiroani/shared';
import RecommendationCard from './RecommendationCard';

const pair: AniListCommunityRecommendation = {
  id: 1,
  rating: 42,
  userRating: 'NO_RATING',
  media: { id: 100, title: { english: 'Spy x Family' } },
  mediaRecommendation: {
    id: 200,
    title: { english: 'Frieren: Beyond Journey’s End' },
    coverImage: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/nx154587.jpg',
    format: 'TV',
    averageScore: 92,
  },
};

const meta = {
  title: 'discover/RecommendationCard',
  component: RecommendationCard,
} satisfies Meta<typeof RecommendationCard>;

export default meta;

type Story = StoryObj<typeof RecommendationCard>;

export const Default: Story = { args: { pair, connected: true, onVote: () => {} } };
export const Disconnected: Story = { args: { pair, connected: false } };
