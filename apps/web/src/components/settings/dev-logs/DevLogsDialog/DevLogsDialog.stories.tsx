import type { Meta, StoryObj } from '@storybook/react-vite';
import DevLogsDialog from './DevLogsDialog';

const meta = {
  title: 'settings/dev-logs/DevLogsDialog',
  component: DevLogsDialog,
} satisfies Meta<typeof DevLogsDialog>;

export default meta;

type Story = StoryObj<typeof DevLogsDialog>;

export const Default: Story = {
  args: { open: true, onOpenChange: () => {} },
};
