import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, expect } from 'storybook/test';
import type { AiringAnime } from '@shiroani/shared';
import AnimeInfoStats from './AnimeInfoStats';

const anime = {
  id: 1,
  airingAt: 1717000000,
  episode: 1,
  media: {
    id: 1,
    title: { romaji: 'Frieren' },
    coverImage: {},
    episodes: 28,
    status: 'RELEASING',
    genres: [],
    averageScore: 90,
  },
} as unknown as AiringAnime;

/**
 * Quick-stats and info-badge rows for the detail dialog: average score,
 * popularity / favourites / ranking when AniList detail is loaded, plus
 * format, status, source, season, episode count and runtime badges. Each badge
 * is conditional on the corresponding field being present.
 */
const meta = {
  title: 'schedule/anime-info/AnimeInfoStats',
  component: AnimeInfoStats,
  parameters: { a11y: { test: 'error' } },
  argTypes: {
    format: { control: 'text', description: 'AniList format code, e.g. "TV".' },
    status: { control: 'text', description: 'AniList status code, e.g. "RELEASING".' },
    episodes: { control: 'number', description: 'Total episode count badge.' },
  },
} satisfies Meta<typeof AnimeInfoStats>;

export default meta;

type Story = StoryObj<typeof AnimeInfoStats>;

/** Basic info from the schedule entry only — score + format + episodes badges. */
export const Default: Story = {
  args: {
    anime,
    details: null,
    topRanking: null,
    format: 'TV',
    status: 'RELEASING',
    episodes: 28,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // averageScore 90 renders via formatRawScore; the episode count surfaces too.
    await expect(canvas.getByText(/28/)).toBeInTheDocument();
  },
};
