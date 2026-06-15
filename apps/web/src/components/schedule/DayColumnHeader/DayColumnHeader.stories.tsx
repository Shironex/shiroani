import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, expect } from 'storybook/test';
import { toLocalDate } from '@shiroani/shared';
import DayColumnHeader from './DayColumnHeader';

/**
 * Editorial day-column header used by the week grids: a mono uppercase label
 * over a large serif day-of-month, with an optional episode-count line. Today's
 * column lights up in the accent colour and appends a "today" suffix.
 */
const meta = {
  title: 'schedule/DayColumnHeader',
  component: DayColumnHeader,
  parameters: { a11y: { test: 'error' } },
  argTypes: {
    day: { control: 'text', description: 'YYYY-MM-DD — drives the day number and the today tint.' },
    label: { control: 'text', description: 'Short weekday label, e.g. "MON".' },
    entryCount: {
      control: 'number',
      description: 'Episode count shown below the date; hidden when zero.',
    },
  },
} satisfies Meta<typeof DayColumnHeader>;

export default meta;

type Story = StoryObj<typeof DayColumnHeader>;

/** A non-today column with a few entries. */
export const Default: Story = {
  args: { day: '2024-01-15', label: 'MON', entryCount: 3 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('MON')).toBeInTheDocument();
    await expect(canvas.getByText('15')).toBeInTheDocument();
  },
};

/** Empty column — the count line is omitted entirely. */
export const NoEntries: Story = {
  args: { day: '2024-01-16', label: 'TUE', entryCount: 0 },
};

/** Today's column — accent tint plus the "today" suffix on the label. */
export const Today: Story = {
  args: { day: toLocalDate(new Date()), label: 'WED', entryCount: 2 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/today/i)).toBeInTheDocument();
  },
};
