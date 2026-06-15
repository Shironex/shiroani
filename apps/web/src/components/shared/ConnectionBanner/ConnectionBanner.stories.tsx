import type { Meta, StoryObj } from '@storybook/react-vite';
import { useConnectionStore } from '@/stores/useConnectionStore';
import ConnectionBanner from './ConnectionBanner';

const meta = {
  title: 'shared/ConnectionBanner',
  component: ConnectionBanner,
} satisfies Meta<typeof ConnectionBanner>;

export default meta;

type Story = StoryObj<typeof ConnectionBanner>;

export const Reconnecting: Story = {
  decorators: [
    Story => {
      useConnectionStore.setState({ status: 'reconnecting' });
      return <Story />;
    },
  ],
};

export const Offline: Story = {
  decorators: [
    Story => {
      useConnectionStore.setState({ status: 'failed' });
      return <Story />;
    },
  ],
};
