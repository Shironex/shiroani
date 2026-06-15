import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, expect } from 'storybook/test';
import { mockExtraStats, mockUserProfile } from '../profile-fixtures';
import ProfileExtraStats from './ProfileExtraStats';

const renderHead = (label: string) => (
  <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">
    {label}
  </h3>
);

/**
 * Richer statistics blocks surfaced only when AniList exposes them — top voice
 * actors, staff, start-year timeline and episode-length distribution. Each block
 * renders only when its array is present; the whole surface is omitted when none
 * are. The parent supplies the section heading via `renderHead`.
 */
const meta = {
  title: 'profile/ProfileExtraStats',
  component: ProfileExtraStats,
  args: { renderHead },
  parameters: {
    // Text rows + headings + decorative bars — axe clean.
    a11y: { test: 'error' },
  },
  argTypes: {
    stats: {
      description:
        'AniList `statistics`; the optional voiceActors/staff/startYears/lengths arrays gate each block.',
    },
    renderHead: { description: 'Render-prop for the shared dashboard section heading.' },
  },
} satisfies Meta<typeof ProfileExtraStats>;

export default meta;

type Story = StoryObj<typeof ProfileExtraStats>;

/** All four optional blocks populated from the richer-stats fixture. */
export const Default: Story = {
  args: { stats: mockExtraStats },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Top voice actors')).toBeInTheDocument();
    await expect(canvas.getByText('Saori Hayami')).toBeInTheDocument();
    await expect(canvas.getByText('By start year')).toBeInTheDocument();
  },
};

/** Only the start-year block populated — the other three sections are omitted. */
export const SingleBlock: Story = {
  args: {
    stats: {
      ...mockUserProfile.statistics,
      startYears: [
        { value: 2023, count: 40, meanScore: 80, minutesWatched: 20000 },
        { value: 2022, count: 30, meanScore: 78, minutesWatched: 15000 },
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('By start year')).toBeInTheDocument();
    await expect(canvas.queryByText('Top voice actors')).not.toBeInTheDocument();
  },
};

/** No richer arrays present — the component renders nothing at all. */
export const NothingToShow: Story = {
  args: { stats: mockUserProfile.statistics },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByText('Top voice actors')).not.toBeInTheDocument();
    await expect(canvas.queryByText('By start year')).not.toBeInTheDocument();
  },
};
