import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, expect } from 'storybook/test';
import FeedLoadingAnimation from './FeedLoadingAnimation';

/**
 * Decorative SVG loading state for the news feed: animated RSS signal waves,
 * floating news-card silhouettes, and sparkles, with a localized "Loading news"
 * label and pulsing dots. Takes no props and reads no state — the SVG is
 * `aria-hidden`, leaving the text label as the only announced content.
 */
const meta = {
  title: 'feed/FeedLoadingAnimation',
  component: FeedLoadingAnimation,
  parameters: {
    // The animation is decorative (aria-hidden); only the localized label is
    // exposed. Passes axe clean.
    a11y: { test: 'error' },
  },
} satisfies Meta<typeof FeedLoadingAnimation>;

export default meta;

type Story = StoryObj<typeof FeedLoadingAnimation>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Loading news')).toBeInTheDocument();
  },
};
