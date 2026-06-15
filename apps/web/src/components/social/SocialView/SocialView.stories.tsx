import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, expect } from 'storybook/test';
import { withFullHeight } from '../../../../.storybook/decorators';
import { useAniListAuthStore } from '@/stores/useAniListAuthStore';
import SocialView from './SocialView';

/**
 * Top-level Community screen (Społeczność) — the activity feed of the people the
 * connected AniList viewer follows, with a header refresh action. Gates on
 * connection: a disconnected viewer gets a "connect AniList" prompt rather than
 * an empty list. The feed hook fetches on mount only when connected (which opens
 * a socket), so the story exercises the socket-free disconnected state; the
 * loading / error / populated states are covered in SocialView.test.tsx where
 * the data hook is mocked.
 */
const meta = {
  title: 'social/SocialView',
  component: SocialView,
  parameters: {
    layout: 'fullscreen',
    // The disconnected connect-prompt state passes axe clean.
    a11y: { test: 'error' },
  },
  decorators: [withFullHeight],
} satisfies Meta<typeof SocialView>;

export default meta;

type Story = StoryObj<typeof SocialView>;

/**
 * Disconnected is the only fully socket-free state: the feed hook gates on
 * `connected` and never emits, so the connect prompt renders without a backend.
 * The refresh action is hidden until an account is connected.
 */
export const Disconnected: Story = {
  beforeEach: () => {
    useAniListAuthStore.setState({ status: { connected: false }, fetchStatus: async () => {} });
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { name: 'Community' })).toBeInTheDocument();
    await expect(canvas.getByText(/Connect an AniList account/i)).toBeInTheDocument();
    // The refresh action is gated behind connection.
    await expect(
      canvas.queryByRole('button', { name: 'Refresh community feed' })
    ).not.toBeInTheDocument();
  },
};
