import type { Meta, StoryObj } from '@storybook/react-vite';
import type { AiringAnime } from '@shiroani/shared';
import DailyView from './DailyView';

const anime = {
  id: 1,
  airingAt: 1717003600,
  episode: 5,
  media: {
    id: 1,
    title: { romaji: 'Frieren' },
    coverImage: { medium: 'x.jpg' },
    episodes: 28,
    status: 'RELEASING',
    genres: [],
    format: 'TV',
  },
} as unknown as AiringAnime;

const meta = {
  title: 'schedule/DailyView',
  component: DailyView,
} satisfies Meta<typeof DailyView>;

export default meta;

type Story = StoryObj<typeof DailyView>;

export const Default: Story = {
  args: { entries: [], day: '2024-01-15' },
};

export const Populated: Story = {
  args: { entries: [anime], day: '2024-01-15' },
};
