import type { Meta, StoryObj } from '@storybook/react-vite';
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

const meta = {
  title: 'library/AnimeDetailExtras',
  component: AnimeDetailExtras,
  beforeEach: () => {
    useAnimeDetailStore.setState({
      details: new Map([[ANILIST_ID, detail]]),
      inFlight: new Set(),
      failed: new Set(),
    });
    useLibraryStore.setState({ entries: [] });
  },
  args: { anilistId: ANILIST_ID, onNavigate: () => {} },
} satisfies Meta<typeof AnimeDetailExtras>;

export default meta;

type Story = StoryObj<typeof AnimeDetailExtras>;

export const Default: Story = {};
