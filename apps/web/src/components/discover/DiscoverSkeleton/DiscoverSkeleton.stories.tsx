import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import DiscoverSkeleton from './DiscoverSkeleton';

/**
 * Placeholder grid shown while a browse/search page's first load is in flight.
 * Purely presentational: a grid of card-shaped shimmer blocks marked
 * `aria-busy` so assistive tech announces the loading region. No interactive
 * elements, so axe runs clean.
 */
const meta = {
  title: 'discover/DiscoverSkeleton',
  component: DiscoverSkeleton,
  parameters: { a11y: { test: 'error' } },
} satisfies Meta<typeof DiscoverSkeleton>;

export default meta;

type Story = StoryObj<typeof DiscoverSkeleton>;

/** The loading placeholder grid. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  },
};
