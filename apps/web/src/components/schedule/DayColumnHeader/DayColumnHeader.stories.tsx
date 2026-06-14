import type { Meta, StoryObj } from '@storybook/react-vite';
import DayColumnHeader from './DayColumnHeader';

const meta = {
  title: 'schedule/DayColumnHeader',
  component: DayColumnHeader,
} satisfies Meta<typeof DayColumnHeader>;

export default meta;

type Story = StoryObj<typeof DayColumnHeader>;

export const Default: Story = {
  args: { day: '2024-01-15', label: 'MON', entryCount: 3 },
};
