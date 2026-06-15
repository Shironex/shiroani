import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn } from 'storybook/test';
import type { LogEntry } from '@shiroani/shared';
import LogEntryRow from './LogEntryRow';

/**
 * A single log line in the dev-logs viewer: a level pill + timestamp + context
 * + message. When the entry carries structured `data`, an expand toggle reveals
 * a pretty-printed block. Render the row inside a `<ul>` for valid markup.
 */
const baseEntry: LogEntry = {
  timestamp: '2026-01-01T12:00:00.000Z',
  level: 'info',
  context: 'Test',
  message: 'hello',
};

const meta = {
  title: 'settings/dev-logs/LogEntryRow',
  component: LogEntryRow,
  argTypes: {
    entry: { control: 'object', description: 'The log entry to render.' },
    expanded: { control: 'boolean', description: 'Whether the data block is expanded.' },
    onToggle: { description: 'Toggle the expanded data block.' },
  },
  decorators: [
    Story => (
      <ul>
        <Story />
      </ul>
    ),
  ],
  parameters: {
    a11y: { test: 'error' },
  },
} satisfies Meta<typeof LogEntryRow>;

export default meta;

type Story = StoryObj<typeof LogEntryRow>;

/** A plain info line with no structured data. */
export const Info: Story = {
  args: { entry: baseEntry, expanded: false, onToggle: fn() },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('hello')).toBeInTheDocument();
    await expect(canvas.getByText('[Test]')).toBeInTheDocument();
  },
};

/** An error line. */
export const ErrorLevel: Story = {
  args: {
    entry: { ...baseEntry, level: 'error', context: 'Updater', message: 'Download failed' },
    expanded: false,
    onToggle: fn(),
  },
};

/** A warning line. */
export const Warn: Story = {
  args: {
    entry: { ...baseEntry, level: 'warn', context: 'Sync', message: 'Retrying' },
    expanded: false,
    onToggle: fn(),
  },
};

/** An entry with structured data — the expand toggle reveals the data block. */
export const WithData: Story = {
  args: {
    entry: { ...baseEntry, message: 'Saved', data: { id: 7, ok: true } },
    expanded: false,
    onToggle: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const toggle = canvas.getByRole('button');
    await userEvent.click(toggle);
    await expect(args.onToggle).toHaveBeenCalledOnce();
  },
};

/** The data block expanded. */
export const Expanded: Story = {
  args: {
    entry: { ...baseEntry, message: 'Saved', data: { id: 7, ok: true } },
    expanded: true,
    onToggle: fn(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/"id": 7/)).toBeInTheDocument();
  },
};
