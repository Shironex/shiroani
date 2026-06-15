import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, waitFor } from 'storybook/test';
import type { AnimeDetail, AnimeEntry } from '@shiroani/shared';
import { useAnimeDetailStore } from '@/stores/useAnimeDetailStore';
import { useLibraryStore } from '@/stores/useLibraryStore';
import RelationsSection from './RelationsSection';

const ANILIST_ID = 9253;
const SEQUEL_ID = 201;

const detail = {
  id: ANILIST_ID,
  relations: {
    edges: [
      {
        relationType: 'SEQUEL',
        node: { id: SEQUEL_ID, title: { romaji: 'Steins;Gate 0' }, coverImage: {} },
      },
      {
        relationType: 'SIDE_STORY',
        node: { id: 202, title: { romaji: 'Steins;Gate: Egg of Time' }, coverImage: {} },
      },
    ],
  },
} as unknown as AnimeDetail;

const sequelEntry: AnimeEntry = {
  id: 7,
  anilistId: SEQUEL_ID,
  title: 'Steins;Gate 0',
  status: 'watching',
  currentEpisode: 0,
  addedAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
};

/** Related-entries grid for the library detail modal — in-library relations are openable, the rest are shown muted. */
const meta = {
  title: 'library/RelationsSection',
  component: RelationsSection,
  parameters: {
    // Relation cards are buttons with aria-labels; covers have alt text.
    a11y: { test: 'error' },
  },
  argTypes: {
    anilistId: {
      description:
        'AniList media id whose cached relations to render (the detail is self-fetched).',
    },
  },
  beforeEach: () => {
    // Seed a resolved detail so the section renders without a backend.
    useAnimeDetailStore.setState({
      details: new Map([[ANILIST_ID, detail]]),
      inFlight: new Set(),
      failed: new Set(),
    });
    useLibraryStore.setState({ entries: [], selectedEntry: null, isDetailOpen: false });
  },
} satisfies Meta<typeof RelationsSection>;

export default meta;

type Story = StoryObj<typeof RelationsSection>;

/** No relations are in the library, so every card is a disabled "Not in library" button. */
export const Default: Story = {
  args: { anilistId: ANILIST_ID },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Both relation cards render with the "not in library" accessible name and are inert.
    const cards = await canvas.findAllByRole('button', { name: 'Not in library' });
    await expect(cards).toHaveLength(2);
    await expect(cards[0]).toBeDisabled();
  },
};

/** A relation that exists in the library is openable; clicking it opens its detail in the store. */
export const InLibrary: Story = {
  args: { anilistId: ANILIST_ID },
  beforeEach: () => {
    useAnimeDetailStore.setState({
      details: new Map([[ANILIST_ID, detail]]),
      inFlight: new Set(),
      failed: new Set(),
    });
    useLibraryStore.setState({
      entries: [sequelEntry],
      selectedEntry: null,
      isDetailOpen: false,
    });
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const openButton = await canvas.findByRole('button', { name: 'Open in library' });
    await expect(openButton).toBeEnabled();
    await userEvent.click(openButton);
    await waitFor(() => expect(useLibraryStore.getState().isDetailOpen).toBe(true));
    await expect(useLibraryStore.getState().selectedEntry).toEqual(sequelEntry);
  },
};
