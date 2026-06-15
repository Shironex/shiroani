import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import RandomSkeleton from './RandomSkeleton';

/**
 * Placeholder for the Random showcase card while its pool loads — mirrors the
 * showcase's poster + info two-column layout with shimmer blocks. Purely
 * presentational with no interactive elements, so axe runs clean.
 */
const meta = {
  title: 'discover/random/RandomSkeleton',
  component: RandomSkeleton,
  parameters: { a11y: { test: 'error' } },
} satisfies Meta<typeof RandomSkeleton>;

export default meta;

type Story = StoryObj<typeof RandomSkeleton>;

/** The showcase loading placeholder. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('.animate-pulse')).toBeInTheDocument();
  },
};
