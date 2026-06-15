import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn } from 'storybook/test';
import { useConnectionStore } from '@/stores/useConnectionStore';
import ConnectionBanner from './ConnectionBanner';

/**
 * A thin, top-anchored status banner driven entirely by `useConnectionStore`.
 * It hides itself while `connected`, shows a spinner + "Reconnecting…" while
 * `reconnecting`, and an offline message with a retry button when the
 * connection has `failed`. The banner is a polite ARIA live region.
 */
const meta = {
  title: 'shared/ConnectionBanner',
  component: ConnectionBanner,
  parameters: {
    a11y: { test: 'error' },
  },
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

export const RetriesOnClick: Story = {
  decorators: [
    Story => {
      useConnectionStore.setState({ status: 'failed', retryConnection: fn() });
      return <Story />;
    },
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole('button', { name: /try again|spróbuj/i }));
    await expect(useConnectionStore.getState().retryConnection).toHaveBeenCalledTimes(1);
  },
};
