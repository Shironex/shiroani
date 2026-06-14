import type { Meta, StoryObj } from '@storybook/react-vite';
import GreetingBanner from './GreetingBanner';

const meta = {
  title: 'browser/newtab/GreetingBanner',
  component: GreetingBanner,
} satisfies Meta<typeof GreetingBanner>;

export default meta;

type Story = StoryObj<typeof GreetingBanner>;

export const Default: Story = {
  args: { showName: true },
};

export const Anonymous: Story = {
  args: { showName: false },
};
