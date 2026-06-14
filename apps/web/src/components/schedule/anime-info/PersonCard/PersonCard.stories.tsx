import type { Meta, StoryObj } from '@storybook/react-vite';
import PersonCard from './PersonCard';

const meta = {
  title: 'schedule/anime-info/PersonCard',
  component: PersonCard,
} satisfies Meta<typeof PersonCard>;

export default meta;

type Story = StoryObj<typeof PersonCard>;

export const Default: Story = {
  args: {
    imageUrl: 'https://s4.anilist.co/file/anilistcdn/character/medium/default.png',
    name: 'Frieren',
    subtitle: 'main',
  },
};

export const NoImage: Story = {
  args: {
    name: 'Fern',
    subtitle: 'supporting',
  },
};
