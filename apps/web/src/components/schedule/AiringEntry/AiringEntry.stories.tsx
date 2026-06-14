import type { Meta, StoryObj } from '@storybook/react-vite';
import type { AiringAnime } from '@shiroani/shared';
import AiringEntry from './AiringEntry';

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
  title: 'schedule/AiringEntry',
  component: AiringEntry,
} satisfies Meta<typeof AiringEntry>;

export default meta;

type Story = StoryObj<typeof AiringEntry>;

export const Default: Story = {
  args: { anime, status: 'soon', now: 1717000000 },
};
