import type { Meta, StoryObj } from '@storybook/react-vite';
import type { AnimeEntry } from '@shiroani/shared';
import { useLibraryStore } from '@/stores/useLibraryStore';
import LibraryListItem from './LibraryListItem';

const entry: AnimeEntry = {
  id: 1,
  title: 'Steins;Gate',
  status: 'watching',
  currentEpisode: 5,
  episodes: 24,
  score: 9,
  coverImage: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/9253.jpg',
  resumeUrl: 'https://example.com/watch/5',
  addedAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-06-01T00:00:00Z',
};

const meta = {
  title: 'library/LibraryListItem',
  component: LibraryListItem,
  beforeEach: () => {
    useLibraryStore.setState({ selectionMode: false, selectedIds: new Set() });
  },
  args: { onClick: () => {} },
} satisfies Meta<typeof LibraryListItem>;

export default meta;

type Story = StoryObj<typeof LibraryListItem>;

export const Default: Story = {
  args: { entry },
};

export const NoScore: Story = {
  args: { entry: { ...entry, score: 0 } },
};
