import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect } from 'storybook/test';
import type { AnimeDetailRecommendation } from '@shiroani/shared';
import { useLibraryStore } from '@/stores/useLibraryStore';
import RecommendationsSection from './RecommendationsSection';

const recommendations: AnimeDetailRecommendation[] = [
  {
    mediaRecommendation: {
      id: 101,
      title: { romaji: 'Made in Abyss' },
      coverImage: {},
      format: 'TV',
      averageScore: 86,
    },
  },
  {
    mediaRecommendation: {
      id: 102,
      title: { romaji: 'Mushishi' },
      coverImage: {},
      format: 'TV',
      averageScore: 84,
    },
  },
];

/** Horizontal "More like this" row of AniList recommendation posters — already-owned titles open detail, the rest add to the library. */
const meta = {
  title: 'library/RecommendationsSection',
  component: RecommendationsSection,
  parameters: {
    // Each poster card is a button with an aria-label; covers have alt text.
    a11y: { test: 'error' },
  },
  argTypes: {
    recommendations: {
      description: 'Recommendation edges from the cached AnimeDetail; renders nothing when empty.',
    },
  },
  beforeEach: () => {
    useLibraryStore.setState({ entries: [], selectedEntry: null, isDetailOpen: false });
  },
} satisfies Meta<typeof RecommendationsSection>;

export default meta;

type Story = StoryObj<typeof RecommendationsSection>;

/** None of the recommendations are owned, so each card offers an "Add to library" action. */
export const Default: Story = {
  args: { recommendations },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Not-in-library cards expose the add affordance and remain clickable.
    const addCard = await canvas.findByRole('button', {
      name: 'Add "Made in Abyss" to library',
    });
    await expect(addCard).toBeEnabled();
    await userEvent.click(addCard);
    // The add-flow is fire-and-forget against the dormant socket; the card persists.
    await expect(
      canvas.getByRole('button', { name: 'Add "Made in Abyss" to library' })
    ).toBeInTheDocument();
  },
};

export const Empty: Story = {
  args: { recommendations: [] },
};
