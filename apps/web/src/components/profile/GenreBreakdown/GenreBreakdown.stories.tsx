import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, expect } from 'storybook/test';
import type { UserProfile } from '@shiroani/shared';
import GenreBreakdown from './GenreBreakdown';

type Genres = UserProfile['statistics']['genres'];

const genres = [
  { name: 'Action', count: 120 },
  { name: 'Drama', count: 86 },
  { name: 'Comedy', count: 64 },
  { name: 'Romance', count: 40 },
  { name: 'Fantasy', count: 22 },
] as unknown as Genres;

/**
 * Ordered horizontal-bar breakdown of the top N watched genres. Each row pairs
 * the genre name with a percentage relative to the most-watched genre, drawn as
 * a pill bar. Presentational; falls back to a muted hint when there is no data.
 */
const meta = {
  title: 'profile/GenreBreakdown',
  component: GenreBreakdown,
  parameters: {
    // Text rows + decorative bars — axe clean.
    a11y: { test: 'error' },
  },
  argTypes: {
    genres: {
      description: 'AniList `statistics.genres` (name + count); ranked descending by count.',
    },
    limit: { control: { type: 'number' }, description: 'How many top genres to show (default 5).' },
  },
} satisfies Meta<typeof GenreBreakdown>;

export default meta;

type Story = StoryObj<typeof GenreBreakdown>;

/** Populated — the top genre reads 100% and the rest scale relative to it. */
export const Default: Story = {
  args: { genres },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Action')).toBeInTheDocument();
    await expect(canvas.getByText('100%')).toBeInTheDocument();
  },
};

/** `limit` caps how many rows render even when more genres are supplied. */
export const Limited: Story = {
  args: { genres, limit: 2 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Action')).toBeInTheDocument();
    await expect(canvas.getByText('Drama')).toBeInTheDocument();
    await expect(canvas.queryByText('Comedy')).not.toBeInTheDocument();
  },
};

/** Empty — no genre data shows the muted fallback hint instead of bars. */
export const Empty: Story = {
  args: { genres: [] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('No genre data yet.')).toBeInTheDocument();
  },
};
