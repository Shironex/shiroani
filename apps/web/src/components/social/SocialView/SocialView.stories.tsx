import type { Meta, StoryObj } from '@storybook/react-vite';
import { useAniListAuthStore } from '@/stores/useAniListAuthStore';
import SocialView from './SocialView';

const meta = {
  title: 'social/SocialView',
  component: SocialView,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof SocialView>;

export default meta;

type Story = StoryObj<typeof SocialView>;

/**
 * Disconnected is the only fully socket-free state: the feed hook gates on
 * `connected` and never emits, so the connect prompt renders without a backend.
 * Loading / error / populated states are exercised in SocialView.test.tsx, where
 * the data hook is mocked.
 */
export const Disconnected: Story = {
  beforeEach: () => {
    useAniListAuthStore.setState({ status: { connected: false } });
  },
};
