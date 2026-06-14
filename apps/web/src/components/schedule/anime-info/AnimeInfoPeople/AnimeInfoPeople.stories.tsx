import type { Meta, StoryObj } from '@storybook/react-vite';
import AnimeInfoPeople from './AnimeInfoPeople';

const meta = {
  title: 'schedule/anime-info/AnimeInfoPeople',
  component: AnimeInfoPeople,
} satisfies Meta<typeof AnimeInfoPeople>;

export default meta;

type Story = StoryObj<typeof AnimeInfoPeople>;

export const Default: Story = {
  args: {
    details: null,
  },
};
