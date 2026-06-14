import type { Meta, StoryObj } from '@storybook/react-vite';
import BrowserWebview from './BrowserWebview';

const meta = {
  title: 'browser/BrowserWebview',
  component: BrowserWebview,
} satisfies Meta<typeof BrowserWebview>;

export default meta;

type Story = StoryObj<typeof BrowserWebview>;

export const Default: Story = {
  args: { paneId: 'pane-1', initialUrl: 'https://example.com', isActive: true },
};
