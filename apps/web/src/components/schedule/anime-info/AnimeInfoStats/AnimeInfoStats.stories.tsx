import type { Meta, StoryObj } from '@storybook/react-vite';
import type { AiringAnime } from '@shiroani/shared';
import AnimeInfoStats from './AnimeInfoStats';

const anime = {
  id: 1,
  airingAt: 1717000000,
  episode: 1,
  media: {
    id: 1,
    title: { romaji: 'Frieren' },
    coverImage: {},
    episodes: 28,
    status: 'RELEASING',
    genres: [],
    averageScore: 90,
  },
} as unknown as AiringAnime;

const meta = {
  title: 'schedule/anime-info/AnimeInfoStats',
  component: AnimeInfoStats,
} satisfies Meta<typeof AnimeInfoStats>;

export default meta;

type Story = StoryObj<typeof AnimeInfoStats>;

export const Default: Story = {
  args: {
    anime,
    details: null,
    topRanking: null,
    format: 'TV',
    status: 'RELEASING',
    episodes: 28,
  },
};
