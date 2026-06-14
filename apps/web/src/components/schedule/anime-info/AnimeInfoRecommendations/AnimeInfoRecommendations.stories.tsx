import type { Meta, StoryObj } from '@storybook/react-vite';
import AnimeInfoRecommendations from './AnimeInfoRecommendations';

const meta = {
  title: 'schedule/anime-info/AnimeInfoRecommendations',
  component: AnimeInfoRecommendations,
} satisfies Meta<typeof AnimeInfoRecommendations>;

export default meta;

type Story = StoryObj<typeof AnimeInfoRecommendations>;

export const Default: Story = {
  args: {
    details: null,
  },
};
