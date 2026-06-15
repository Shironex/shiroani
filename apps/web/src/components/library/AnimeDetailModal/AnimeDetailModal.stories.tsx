import type { Meta, StoryObj } from '@storybook/react-vite';
import type { AnimeEntry } from '@shiroani/shared';
import AnimeDetailModal from './AnimeDetailModal';

const entry: AnimeEntry = {
  id: 1,
  title: 'Steins;Gate',
  status: 'watching',
  currentEpisode: 5,
  episodes: 24,
  score: 9,
  coverImage: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/9253.jpg',
  notes: 'A masterpiece of time travel.',
  addedAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-06-01T00:00:00Z',
};

const meta = {
  title: 'library/AnimeDetailModal',
  component: AnimeDetailModal,
  parameters: { layout: 'fullscreen' },
  args: { open: true, onOpenChange: () => {} },
} satisfies Meta<typeof AnimeDetailModal>;

export default meta;

type Story = StoryObj<typeof AnimeDetailModal>;

// Entry without an anilistId so the self-fetching relations/extras sections stay
// gated off — keeps the story socket-free.
export const Default: Story = {
  args: { entry },
};
