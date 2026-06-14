import type { Meta, StoryObj } from '@storybook/react-vite';
import BrowserHistoryDialog from './BrowserHistoryDialog';

const meta = {
  title: 'browser/BrowserHistoryDialog',
  component: BrowserHistoryDialog,
} satisfies Meta<typeof BrowserHistoryDialog>;

export default meta;

type Story = StoryObj<typeof BrowserHistoryDialog>;

export const Default: Story = {
  args: { open: true, onOpenChange: () => {}, onNavigate: () => {} },
};
