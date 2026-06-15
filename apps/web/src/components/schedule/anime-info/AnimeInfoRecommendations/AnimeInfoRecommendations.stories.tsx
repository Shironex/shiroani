import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, expect } from 'storybook/test';
import type { AnimeDetail } from '@shiroani/shared';
import { useLibraryStore } from '@/stores/useLibraryStore';
import AnimeInfoRecommendations from './AnimeInfoRecommendations';

const details = {
  recommendations: {
    nodes: [
      {
        mediaRecommendation: {
          id: 7,
          title: { romaji: 'Sousou no Frieren' },
          coverImage: { medium: 'https://placehold.co/80x112' },
          format: 'TV',
          averageScore: 90,
        },
      },
    ],
  },
} as unknown as AnimeDetail;

/**
 * "More like this" — an AniList recommendations row in the detail dialog. Each
 * poster offers an add-to-library affordance for titles not yet tracked, reading
 * library membership from `useLibraryStore` (seeded empty here). Renders nothing
 * when the loaded detail carries no recommendations.
 */
const meta = {
  title: 'schedule/anime-info/AnimeInfoRecommendations',
  component: AnimeInfoRecommendations,
  parameters: { a11y: { test: 'error' } },
  beforeEach: () => {
    useLibraryStore.setState({ entries: [] });
  },
} satisfies Meta<typeof AnimeInfoRecommendations>;

export default meta;

type Story = StoryObj<typeof AnimeInfoRecommendations>;

/** No detail loaded — renders nothing. */
export const Empty: Story = {
  args: { details: null },
};

/** With one recommendation — the poster card and its title render. */
export const WithRecommendations: Story = {
  args: { details },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Sousou no Frieren')).toBeInTheDocument();
  },
};
