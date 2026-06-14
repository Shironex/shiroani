import type { Meta, StoryObj } from '@storybook/react-vite';
import AnimeInfoMeta from './AnimeInfoMeta';

const meta = {
  title: 'schedule/anime-info/AnimeInfoMeta',
  component: AnimeInfoMeta,
} satisfies Meta<typeof AnimeInfoMeta>;

export default meta;

type Story = StoryObj<typeof AnimeInfoMeta>;

export const Default: Story = {
  args: {
    details: null,
    mainStudios: [],
    genres: ['Action', 'Fantasy'],
    nonSpoilerTags: [],
    loading: false,
    descExpanded: false,
    onToggleDesc: () => {},
    language: 'en',
  },
};
