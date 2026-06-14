import type { Meta, StoryObj } from '@storybook/react-vite';
import AnimeInfoLinks from './AnimeInfoLinks';

const meta = {
  title: 'schedule/anime-info/AnimeInfoLinks',
  component: AnimeInfoLinks,
} satisfies Meta<typeof AnimeInfoLinks>;

export default meta;

type Story = StoryObj<typeof AnimeInfoLinks>;

export const Default: Story = {
  args: {
    details: null,
    streamingLinks: [],
    onNavigate: () => {},
  },
};
