import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, expect } from 'storybook/test';
import type { UserProfile } from '@shiroani/shared';
import { mockUserProfile } from '../profile-fixtures';
import ProfileStatGrid from './ProfileStatGrid';

/**
 * 4-up headline stat grid shown at the top of the Profile main column —
 * COMPLETED / WATCHING / PLANNING / mean-score summary cards derived from the
 * profile's `statistics.statuses`. Purely presentational (no interactivity).
 */
const meta = {
  title: 'profile/ProfileStatGrid',
  component: ProfileStatGrid,
  parameters: {
    // Plain text tiles — axe clean.
    a11y: { test: 'error' },
  },
  argTypes: {
    profile: { description: 'AniList profile whose `statistics.statuses` drive the four counts.' },
  },
} satisfies Meta<typeof ProfileStatGrid>;

export default meta;

type Story = StoryObj<typeof ProfileStatGrid>;

/** Populated grid — the counts come straight from the seeded status buckets. */
export const Default: Story = {
  args: { profile: mockUserProfile },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('220')).toBeInTheDocument(); // completed
    await expect(canvas.getByText('24')).toBeInTheDocument(); // watching
    await expect(canvas.getByText('48')).toBeInTheDocument(); // planning
    await expect(canvas.getByText('7.8')).toBeInTheDocument(); // mean score
  },
};

/** Missing status buckets fall back to 0, and a 0 mean score renders as an em dash. */
export const Sparse: Story = {
  args: {
    profile: {
      ...mockUserProfile,
      statistics: { ...mockUserProfile.statistics, statuses: [], meanScore: 0 },
    } satisfies UserProfile,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText('0').length).toBeGreaterThanOrEqual(3);
    await expect(canvas.getByText('—')).toBeInTheDocument();
  },
};
