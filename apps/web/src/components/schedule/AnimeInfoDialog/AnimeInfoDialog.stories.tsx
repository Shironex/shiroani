import type { Meta, StoryObj } from '@storybook/react-vite';
import type { AiringAnime } from '@shiroani/shared';
import AnimeInfoDialog from './AnimeInfoDialog';

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
  },
} as unknown as AiringAnime;

const meta = {
  title: 'schedule/AnimeInfoDialog',
  component: AnimeInfoDialog,
} satisfies Meta<typeof AnimeInfoDialog>;

export default meta;

type Story = StoryObj<typeof AnimeInfoDialog>;

export const Default: Story = {
  args: {
    anime,
    open: true,
    onOpenChange: () => {},
  },
};
