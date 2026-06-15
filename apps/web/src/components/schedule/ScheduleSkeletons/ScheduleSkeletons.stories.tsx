import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { DailyViewSkeleton, WeeklyViewSkeleton, TimetableViewSkeleton } from './ScheduleSkeletons';

/**
 * Loading placeholders for the three schedule view modes. Each marks its root
 * with `aria-busy="true"` and lays out the same skeleton silhouette as its real
 * view (day timeline / 7-column week grid / poster board) so the swap to loaded
 * content is visually stable.
 */
const meta = {
  title: 'schedule/ScheduleSkeletons',
  component: DailyViewSkeleton,
  parameters: { a11y: { test: 'error' } },
} satisfies Meta<typeof DailyViewSkeleton>;

export default meta;

type Story = StoryObj<typeof DailyViewSkeleton>;

/** Day timeline skeleton — hour gutter plus stacked slot placeholders. */
export const Daily: Story = {
  render: () => <DailyViewSkeleton />,
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  },
};

/** Week grid skeleton — 7 columns of card placeholders. */
export const Weekly: Story = {
  render: () => <WeeklyViewSkeleton />,
};

/** Poster board skeleton — 7 columns of poster-aspect placeholders. */
export const Timetable: Story = {
  render: () => <TimetableViewSkeleton />,
};
