import type { Meta, StoryObj } from '@storybook/react-vite';
import { DailyViewSkeleton, WeeklyViewSkeleton, TimetableViewSkeleton } from './ScheduleSkeletons';

const meta = {
  title: 'schedule/ScheduleSkeletons',
  component: DailyViewSkeleton,
} satisfies Meta<typeof DailyViewSkeleton>;

export default meta;

type Story = StoryObj<typeof DailyViewSkeleton>;

export const Daily: Story = {
  render: () => <DailyViewSkeleton />,
};

export const Weekly: Story = {
  render: () => <WeeklyViewSkeleton />,
};

export const Timetable: Story = {
  render: () => <TimetableViewSkeleton />,
};
