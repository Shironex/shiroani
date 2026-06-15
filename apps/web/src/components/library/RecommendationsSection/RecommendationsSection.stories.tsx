import type { Meta, StoryObj } from '@storybook/react-vite';
import type { AnimeDetailRecommendation } from '@shiroani/shared';
import { useLibraryStore } from '@/stores/useLibraryStore';
import RecommendationsSection from './RecommendationsSection';

const recommendations: AnimeDetailRecommendation[] = [
  {
    mediaRecommendation: {
      id: 101,
      title: { romaji: 'Made in Abyss' },
      coverImage: {},
      format: 'TV',
      averageScore: 86,
    },
  },
  {
    mediaRecommendation: {
      id: 102,
      title: { romaji: 'Mushishi' },
      coverImage: {},
      format: 'TV',
      averageScore: 84,
    },
  },
];

const meta = {
  title: 'library/RecommendationsSection',
  component: RecommendationsSection,
  beforeEach: () => {
    useLibraryStore.setState({ entries: [] });
  },
} satisfies Meta<typeof RecommendationsSection>;

export default meta;

type Story = StoryObj<typeof RecommendationsSection>;

export const Default: Story = {
  args: { recommendations },
};

export const Empty: Story = {
  args: { recommendations: [] },
};
