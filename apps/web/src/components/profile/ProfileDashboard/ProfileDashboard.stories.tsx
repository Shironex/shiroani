import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn } from 'storybook/test';
import type { UserProfile } from '@shiroani/shared';
import { useAniListAuthStore } from '@/stores/useAniListAuthStore';
import { mockUserProfile } from '../profile-fixtures';
import ProfileDashboard from './ProfileDashboard';

/**
 * Main content area of the Profile view — a two-column layout pairing the
 * sidebar with the stat grid, library status rings, genre/studio breakdowns,
 * the activity feed, the social graph and favourites.
 *
 * Stories seed `useAniListAuthStore` DISCONNECTED so the viewer-scoped children
 * (ActivityFeed, ProfileFollow) short-circuit before any socket emit — they only
 * fetch while connected, which would otherwise reconnect forever against the
 * dead test backend and hang the headless Chromium page.
 */
const meta = {
  title: 'profile/ProfileDashboard',
  component: ProfileDashboard,
  parameters: {
    layout: 'fullscreen',
    a11y: { test: 'error' },
  },
  args: {
    profile: mockUserProfile,
    onShare: fn(),
    onRefresh: fn(),
    onDisconnect: fn(),
  },
  argTypes: {
    profile: { description: 'AniList profile rendered across the dashboard surface.' },
    onShare: { description: 'Forwarded to the sidebar Export action.' },
    onRefresh: { description: 'Forwarded to the sidebar Refresh action.' },
    onDisconnect: { description: 'Forwarded to the sidebar Disconnect action.' },
  },
  beforeEach: () => {
    // Disconnected → viewer-scoped children render their not-connected branches
    // and never touch the socket.
    useAniListAuthStore.setState(s => ({ status: { ...s.status, connected: false } }));
  },
} satisfies Meta<typeof ProfileDashboard>;

export default meta;

type Story = StoryObj<typeof ProfileDashboard>;

/** Full dashboard — sidebar, stat grid and breakdown sections all render. */
export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Yor')).toBeInTheDocument();
    await expect(canvas.getByText('Favorite genres')).toBeInTheDocument();
    await expect(canvas.getByText('Recent activity')).toBeInTheDocument();
    await expect(canvas.getByText('MAPPA')).toBeInTheDocument();

    // The sidebar actions are wired through to the dashboard callbacks.
    await userEvent.click(canvas.getByRole('button', { name: 'Export card as PNG' }));
    await expect(args.onShare).toHaveBeenCalledTimes(1);
  },
};

/** A profile with an empty library renders the breakdown empty hints. */
export const NoGenresOrStudios: Story = {
  args: {
    profile: {
      ...mockUserProfile,
      statistics: { ...mockUserProfile.statistics, genres: [], studios: [] },
    } satisfies UserProfile,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('No genre data yet.')).toBeInTheDocument();
    await expect(canvas.getByText('No studio data yet.')).toBeInTheDocument();
  },
};
