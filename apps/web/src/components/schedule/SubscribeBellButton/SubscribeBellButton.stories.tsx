import type { Meta, StoryObj } from '@storybook/react-vite';
import type { AiringAnime } from '@shiroani/shared';
import { SubscribeBellButton } from './index';

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
  title: 'schedule/SubscribeBellButton',
  component: SubscribeBellButton,
} satisfies Meta<typeof SubscribeBellButton>;

export default meta;

type Story = StoryObj<typeof SubscribeBellButton>;

export const Default: Story = {
  args: { anime },
};
