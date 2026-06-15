import type { Meta, StoryObj } from '@storybook/react-vite';
import GreetingBanner from './GreetingBanner';

const meta = {
  title: 'browser/newtab/GreetingBanner',
  component: GreetingBanner,
  parameters: {
    // Renders as a plain block (not a <header>), so it adds no banner landmark
    // when embedded in the new-tab page or the browser chrome.
    a11y: { test: 'error' },
  },
} satisfies Meta<typeof GreetingBanner>;

export default meta;

type Story = StoryObj<typeof GreetingBanner>;

export const Default: Story = {
  args: { showName: true },
};

export const Anonymous: Story = {
  args: { showName: false },
};
