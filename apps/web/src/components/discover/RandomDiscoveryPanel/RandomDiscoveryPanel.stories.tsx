import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn } from 'storybook/test';
import type { DiscoverMedia } from '@/stores/useDiscoverStore';
import { useDiscoverStore } from '@/stores/useDiscoverStore';
import RandomDiscoveryPanel from './RandomDiscoveryPanel';

const pool: DiscoverMedia[] = Array.from({ length: 4 }, (_, i) => ({
  id: i + 1,
  title: { english: `Pick ${i + 1}`, romaji: `Pikku ${i + 1}` },
  coverImage: {
    extraLarge: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/nx154587.jpg',
    medium: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/nx154587.jpg',
  },
  episodes: 12,
  genres: ['Adventure', 'Fantasy'],
  averageScore: 80 + i,
}));

/**
 * Random discovery tab — a genre filter panel above a hero showcase card with
 * prev/next peek chips. Reads `useDiscoverStore` (the shuffled pool, genre
 * selections, loading and error). The panel runs no fetch on mount; seeding the
 * store in `beforeEach` keeps stories socket-free.
 */
const meta = {
  title: 'discover/RandomDiscoveryPanel',
  component: RandomDiscoveryPanel,
  parameters: { a11y: { test: 'error' } },
  args: {
    libraryIds: new Set<number>([2]),
    excludedIds: new Set<number>(),
    onCardClick: fn(),
    onError: fn(),
  },
  argTypes: {
    libraryIds: { description: 'anilistIds in the local library — drives the in-library badges.' },
    excludedIds: { description: 'anilistIds dropped from the pool when the exclude toggle is on.' },
    onCardClick: { description: 'Called with the media when the showcase or a peek is opened.' },
    onError: { description: 'Called when the error-state retry is pressed.' },
  },
} satisfies Meta<typeof RandomDiscoveryPanel>;

export default meta;

type Story = StoryObj<typeof RandomDiscoveryPanel>;

/** Populated — the showcase card opens detail and the nav arrows advance the pick. */
export const Default: Story = {
  beforeEach: () => {
    useDiscoverStore.setState({
      randomShuffled: pool,
      randomIncludedGenres: [],
      randomExcludedGenres: [],
      isRandomLoading: false,
      error: null,
    });
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { name: 'Pick 1' })).toBeInTheDocument();

    // Clicking the showcase title opens the detail with the current pick.
    await userEvent.click(canvas.getByRole('heading', { name: 'Pick 1' }));
    await expect(args.onCardClick).toHaveBeenCalledWith(pool[0]);
  },
};

/** Empty — no pool yet, so the panel shows its onboarding empty state. */
export const Empty: Story = {
  beforeEach: () => {
    useDiscoverStore.setState({
      randomShuffled: [],
      randomIncludedGenres: [],
      randomExcludedGenres: [],
      isRandomLoading: false,
      error: null,
    });
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('No suggestions')).toBeInTheDocument();
  },
};
