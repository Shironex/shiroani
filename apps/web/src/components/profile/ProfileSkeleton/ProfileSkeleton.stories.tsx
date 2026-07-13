import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { withFullHeight } from '../../../../.storybook/decorators';
import ProfileSkeleton from './ProfileSkeleton';

/**
 * Loading placeholder for the Profile view — a 280px sidebar rail (round avatar +
 * name lines + summary tiles + actions) beside a main column (four-tile stat row,
 * status rings and breakdown bars), all as pulsing skeleton blocks. Mirrors the
 * loaded dashboard layout so the swap-in doesn't reflow. Wrapped in an
 * `aria-busy` region so assistive tech announces the loading state.
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
