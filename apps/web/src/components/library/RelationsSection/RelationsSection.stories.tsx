import type { Meta, StoryObj } from '@storybook/react-vite';
import type { AnimeDetail } from '@shiroani/shared';
import { useAnimeDetailStore } from '@/stores/useAnimeDetailStore';
import { useLibraryStore } from '@/stores/useLibraryStore';
import RelationsSection from './RelationsSection';

const ANILIST_ID = 9253;

const detail = {
  id: ANILIST_ID,
  relations: {
    edges: [
      {
        relationType: 'SEQUEL',
        node: { id: 201, title: { romaji: 'Steins;Gate 0' }, coverImage: {} },
      },
      {
        relationType: 'SIDE_STORY',
        node: { id: 202, title: { romaji: 'Steins;Gate: Egg of Time' }, coverImage: {} },
      },
    ],
  },
} as unknown as AnimeDetail;

const meta = {
  title: 'library/RelationsSection',
  component: RelationsSection,
  beforeEach: () => {
    // Seed a resolved detail so the section renders without a backend.
    useAnimeDetailStore.setState({
      details: new Map([[ANILIST_ID, detail]]),
      inFlight: new Set(),
      failed: new Set(),
    });
    useLibraryStore.setState({ entries: [] });
  },
} satisfies Meta<typeof RelationsSection>;

export default meta;

type Story = StoryObj<typeof RelationsSection>;

export const Default: Story = {
  args: { anilistId: ANILIST_ID },
};
