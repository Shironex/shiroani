import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn } from 'storybook/test';
import type { AniListCommunityRecommendation } from '@shiroani/shared';
import RecommendationCard from './RecommendationCard';

const pair: AniListCommunityRecommendation = {
  id: 1,
  rating: 42,
  userRating: 'NO_RATING',
  media: { id: 100, title: { english: 'Spy x Family' } },
  mediaRecommendation: {
    id: 200,
    title: { english: 'Frieren: Beyond Journey’s End' },
    coverImage: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/nx154587.jpg',
    format: 'TV',
    averageScore: 92,
  },
};

/**
 * One community recommendation pairing: a {@link DiscoverCard} for the
 * recommended media plus a thumb up/down vote bar (net community score in the
 * middle) and a "recommended from {source}" line. Voting is gated on the
 * AniList connection. The vote buttons carry accessible names and `aria-pressed`
 * so axe runs clean.
 */
const meta = {
  title: 'discover/RecommendationCard',
  component: RecommendationCard,
  parameters: { a11y: { test: 'error' } },
  args: { pair, connected: true, onClick: fn(), onAddToLibrary: fn(), onVote: fn() },
  argTypes: {
    pair: { description: 'The AniList community recommendation pairing.' },
    connected: { control: 'boolean', description: 'AniList connection — gates the vote buttons.' },
    isVoting: {
      control: 'boolean',
      description: 'Disables the buttons while a vote write is in flight.',
    },
    onVote: { description: 'Called with (pair, rating) when a vote button is pressed.' },
  },
} satisfies Meta<typeof RecommendationCard>;

export default meta;

type Story = StoryObj<typeof RecommendationCard>;

/** Connected — pressing the recommend button casts a RATE_UP vote. */
export const Default: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('+42')).toBeInTheDocument();

    await userEvent.click(canvas.getByRole('button', { name: 'Recommend' }));
    await expect(args.onVote).toHaveBeenCalledWith(pair, 'RATE_UP');
  },
};

/** Disconnected — the vote buttons render but are disabled. */
export const Disconnected: Story = {
  args: { connected: false, onVote: undefined },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Recommend' })).toBeDisabled();
    await expect(canvas.getByRole('button', { name: "Don't recommend" })).toBeDisabled();
  },
};
