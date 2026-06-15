import type { Meta, StoryObj } from '@storybook/react-vite';
import type { LogEntry } from '@shiroani/shared';
import LogEntryRow from './LogEntryRow';

const entry: LogEntry = {
  timestamp: '2026-01-01T12:00:00.000Z',
  level: 'info',
  context: 'Test',
  message: 'hello',
};

const meta = {
  title: 'settings/dev-logs/LogEntryRow',
  component: LogEntryRow,
} satisfies Meta<typeof LogEntryRow>;

export default meta;

type Story = StoryObj<typeof LogEntryRow>;

export const Default: Story = {
  args: { entry, expanded: false, onToggle: () => {} },
};
