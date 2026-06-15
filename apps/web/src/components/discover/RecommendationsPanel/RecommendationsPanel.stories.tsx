import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn, waitFor } from 'storybook/test';
import type { AniListCommunityRecommendation } from '@shiroani/shared';
import { useDiscoverStore } from '@/stores/useDiscoverStore';
import RecommendationsPanel from './RecommendationsPanel';

const recommendations: AniListCommunityRecommendation[] = Array.from({ length: 6 }, (_, i) => ({
  id: i + 1,
  rating: 10 * (i + 1),
  userRating: 'NO_RATING',
  media: { id: 100 + i, title: { english: `Source ${i + 1}` } },
  mediaRecommendation: {
    id: 200 + i,
    title: { english: `Recommended ${i + 1}` },
    coverImage: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/nx154587.jpg',
    format: 'TV',
    averageScore: 80 + i,
  },
}));

/**
 * Community recommendations tab. Reads `useDiscoverStore` for its pairs,
 * loading, error and per-pair voting state, owning its own loading/empty/error
 * rendering like the Random panel. The panel runs no fetch on mount (the parent
 * view triggers fetches on tab change), so seeding the store in `beforeEach`
 * keeps stories socket-free; the voting story additionally stubs
 * `voteRecommendation` so a vote never emits over the socket.
 */
const meta = {
  title: 'discover/RecommendationsPanel',
  component: RecommendationsPanel,
  parameters: { a11y: { test: 'error' } },
  args: { libraryIds: new Set<number>([200]), connected: true, onCardClick: fn() },
  argTypes: {
    libraryIds: { description: 'anilistIds in the local library — drives the in-library badge.' },
    connected: { control: 'boolean', description: 'AniList connection — gates the vote buttons.' },
    onCardClick: { description: 'Called with the media when a card is opened.' },
  },
} satisfies Meta<typeof RecommendationsPanel>;

export default meta;

type Story = StoryObj<typeof RecommendationsPanel>;

/** Populated — voting is stubbed so pressing recommend stays socket-free. */
export const Default: Story = {
  beforeEach: () => {
    useDiscoverStore.setState({
      recommendations,
      isRecommendationsLoading: false,
      recommendationsError: null,
      votingIds: new Set<number>(),
      voteRecommendation: fn().mockResolvedValue(undefined),
    });
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Recommended 1' })).toBeInTheDocument();

    // Voting goes through the stubbed store action — no socket emit.
    const recommendButtons = canvas.getAllByRole('button', { name: 'Recommend' });
    await userEvent.click(recommendButtons[0]);
    await waitFor(() => expect(useDiscoverStore.getState().voteRecommendation).toHaveBeenCalled());
  },
};

/** Empty — connected with no recommendations yet. */
export const Empty: Story = {
  beforeEach: () => {
    useDiscoverStore.setState({
      recommendations: [],
      isRecommendationsLoading: false,
      recommendationsError: null,
      votingIds: new Set<number>(),
    });
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('No recommendations')).toBeInTheDocument();
  },
};

/** Failed fetch — the recommendation-scoped error renders a retry CTA. */
export const LoadError: Story = {
  beforeEach: () => {
    useDiscoverStore.setState({
      recommendations: [],
      isRecommendationsLoading: false,
      recommendationsError: 'network down',
      votingIds: new Set<number>(),
    });
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  },
};
