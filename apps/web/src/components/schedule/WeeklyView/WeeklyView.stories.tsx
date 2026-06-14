import type { Meta, StoryObj } from '@storybook/react-vite';
import WeeklyView from './WeeklyView';

const meta = {
  title: 'schedule/WeeklyView',
  component: WeeklyView,
} satisfies Meta<typeof WeeklyView>;

export default meta;

type Story = StoryObj<typeof WeeklyView>;

export const Default: Story = {
  args: {
    weekDays: [
      '2024-01-15',
      '2024-01-16',
      '2024-01-17',
      '2024-01-18',
      '2024-01-19',
      '2024-01-20',
      '2024-01-21',
    ],
    getEntriesForDay: () => [],
    schedule: {},
  },
};
