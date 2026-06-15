import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { withFullHeight } from '../../../../.storybook/decorators';
import ProfileSkeleton from './ProfileSkeleton';

/**
 * Loading placeholder for the Profile view — a banner, avatar + name lines, a
 * four-tile stat row and descending breakdown bars, all as pulsing skeleton
 * blocks. Wrapped in an `aria-busy` region so assistive tech announces the
 * loading state. Presentational; takes no props.
 */
const meta = {
  title: 'profile/ProfileSkeleton',
  component: ProfileSkeleton,
  parameters: {
    layout: 'fullscreen',
    // Decorative pulsing blocks under an aria-busy region — axe clean.
    a11y: { test: 'error' },
  },
  decorators: [withFullHeight],
} satisfies Meta<typeof ProfileSkeleton>;

export default meta;

type Story = StoryObj<typeof ProfileSkeleton>;

/** The full skeleton layout shown while the first profile payload loads. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  },
};
