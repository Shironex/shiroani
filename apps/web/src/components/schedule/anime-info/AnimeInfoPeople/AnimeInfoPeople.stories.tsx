import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, expect } from 'storybook/test';
import type { AnimeDetail } from '@shiroani/shared';
import AnimeInfoPeople from './AnimeInfoPeople';

const details = {
  characters: {
    edges: [
      {
        node: {
          id: 1,
          name: { full: 'Frieren', userPreferred: 'Frieren' },
          image: { medium: 'https://placehold.co/40' },
        },
        role: 'MAIN',
      },
    ],
  },
  staff: {
    edges: [
      {
        node: {
          id: 2,
          name: { full: 'Keiichirō Saitō', userPreferred: 'Keiichirō Saitō' },
          image: { medium: 'https://placehold.co/40' },
        },
        role: 'Director',
      },
    ],
  },
} as unknown as AnimeDetail;

/**
 * People + relations section of the detail dialog: capped grids of character
 * cards, staff cards, and related-media cards. Each grid renders only when the
 * loaded AniList detail carries that edge list; with no detail it renders
 * nothing.
 */
const meta = {
  title: 'schedule/anime-info/AnimeInfoPeople',
  component: AnimeInfoPeople,
  parameters: { a11y: { test: 'error' } },
} satisfies Meta<typeof AnimeInfoPeople>;

export default meta;

type Story = StoryObj<typeof AnimeInfoPeople>;

/** No detail loaded — renders nothing. */
export const Empty: Story = {
  args: { details: null },
};

/** With characters + staff — both grids render. */
export const WithPeople: Story = {
  args: { details },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Frieren')).toBeInTheDocument();
    await expect(canvas.getByText('Keiichirō Saitō')).toBeInTheDocument();
  },
};
