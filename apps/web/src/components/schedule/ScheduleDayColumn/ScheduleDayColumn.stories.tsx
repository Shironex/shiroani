import type { Meta, StoryObj } from '@storybook/react-vite';
import ScheduleDayColumn from './ScheduleDayColumn';

const meta = {
  title: 'schedule/ScheduleDayColumn',
  component: ScheduleDayColumn,
} satisfies Meta<typeof ScheduleDayColumn>;

export default meta;

type Story = StoryObj<typeof ScheduleDayColumn>;

export const Default: Story = {
  args: {
    day: '2024-01-15',
    label: 'MON',
    entries: [],
    now: 1717000000,
    renderCard: () => null,
    emptyLabel: 'Brak',
  },
};
