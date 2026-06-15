import type { Meta, StoryObj } from '@storybook/react-vite';
import ActivityFeed from './ActivityFeed';

const meta = {
  title: 'profile/ActivityFeed',
  component: ActivityFeed,
} satisfies Meta<typeof ActivityFeed>;

export default meta;

type Story = StoryObj<typeof ActivityFeed>;

/**
 * Disconnected state — with no connected AniList account the feed short-circuits
 * before any socket call and renders the "connect" prompt. Populated and error
 * states are viewer-scoped (socket-backed) and exercised in integration tests.
 */
export const NotConnected: Story = {};
