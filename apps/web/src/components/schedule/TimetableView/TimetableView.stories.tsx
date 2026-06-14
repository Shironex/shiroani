import type { Meta, StoryObj } from '@storybook/react-vite';
import TimetableView from './TimetableView';

const meta = {
  title: 'schedule/TimetableView',
  component: TimetableView,
} satisfies Meta<typeof TimetableView>;

export default meta;

type Story = StoryObj<typeof TimetableView>;

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
