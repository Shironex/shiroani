import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn } from 'storybook/test';
import type { AnimeDetail } from '@shiroani/shared';
import { useAnimeDetailStore } from '@/stores/useAnimeDetailStore';
import { useLibraryStore } from '@/stores/useLibraryStore';
import AnimeDetailExtras from './AnimeDetailExtras';

const ANILIST_ID = 9253;

const detail = {
  id: ANILIST_ID,
  idMal: 9253,
  siteUrl: 'https://anilist.co/anime/9253',
  recommendations: {
    nodes: [
      {
        mediaRecommendation: {
          id: 301,
          title: { romaji: 'Chaos;Head' },
          coverImage: {},
          format: 'TV',
          averageScore: 70,
        },
      },
    ],
  },
  streamingEpisodes: [
    { title: 'Episode 1', thumbnail: '', url: 'https://example.com/1', site: 'Crunchyroll' },
  ],
} as unknown as AnimeDetail;

/** Detail-driven modal footer: recommendations row, per-episode streaming links and AniList/MyAnimeList reference buttons. */
const meta = {
  title: 'library/AnimeDetailExtras',
  component: AnimeDetailExtras,
  parameters: {
    // Buttons carry text/aria names; nested card images have alt text.
    a11y: { test: 'error' },
  },
  argTypes: {
    anilistId: {
      description:
        'AniList media id of the open entry; the detail (recs/streaming/refs) is self-fetched.',
    },
    onNavigate: {
      description: 'Called with a URL when an AniList/MyAnimeList reference button is clicked.',
    },
  },
  beforeEach: () => {
    useAnimeDetailStore.setState({
      details: new Map([[ANILIST_ID, detail]]),
      inFlight: new Set(),
      failed: new Set(),
    });
    useLibraryStore.setState({ entries: [], selectedEntry: null, isDetailOpen: false });
  },
  args: { anilistId: ANILIST_ID, onNavigate: fn() },
} satisfies Meta<typeof AnimeDetailExtras>;

export default meta;

type Story = StoryObj<typeof AnimeDetailExtras>;

/** Clicking the AniList reference button navigates to the detail's siteUrl. */
export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const anilistButton = await canvas.findByRole('button', { name: 'AniList' });
    await userEvent.click(anilistButton);
    await expect(args.onNavigate).toHaveBeenCalledWith('https://anilist.co/anime/9253');
  },
};
