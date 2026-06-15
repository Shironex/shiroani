import type { Meta, StoryObj } from '@storybook/react-vite';
import type { AnimeEntry } from '@shiroani/shared';
import { useLibraryStore } from '@/stores/useLibraryStore';
import AnimeCard from './AnimeCard';

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
  title: 'library/AnimeCard',
  component: AnimeCard,
  beforeEach: () => {
    // Selection mode off so the hover-action overlay (not the checkbox) renders.
    useLibraryStore.setState({ selectionMode: false, selectedIds: new Set() });
  },
  args: { onSelect: () => {}, onContinue: () => {}, onRemove: () => {} },
} satisfies Meta<typeof AnimeCard>;

export default meta;

type Story = StoryObj<typeof AnimeCard>;

export const Watching: Story = {
  args: { entry },
};

export const Completed: Story = {
  args: { entry: { ...entry, status: 'completed', currentEpisode: 24 } },
};

export const NoCover: Story = {
  args: { entry: { ...entry, coverImage: undefined } },
};
