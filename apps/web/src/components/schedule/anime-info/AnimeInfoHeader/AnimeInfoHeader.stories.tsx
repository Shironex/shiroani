import type { Meta, StoryObj } from '@storybook/react-vite';
import AnimeInfoHeader from './AnimeInfoHeader';

const meta = {
  title: 'schedule/anime-info/AnimeInfoHeader',
  component: AnimeInfoHeader,
} satisfies Meta<typeof AnimeInfoHeader>;

export default meta;

type Story = StoryObj<typeof AnimeInfoHeader>;

export const Default: Story = {
  args: {
    title: 'Frieren: Beyond Journey’s End',
    details: null,
    coverUrl: 'https://placehold.co/200x280',
    bannerUrl: 'https://placehold.co/800x300',
    accentColor: '#7c6f9c',
    isSubscribed: false,
    onToggleSubscribe: () => {},
  },
};
