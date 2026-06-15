import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn } from 'storybook/test';
import type { UserProfile } from '@shiroani/shared';
import { useAniListAuthStore } from '@/stores/useAniListAuthStore';
import { mockUserProfile } from '../profile-fixtures';
import ProfileSidebar from './ProfileSidebar';

/**
 * Left column of the Profile view — avatar (or an initial fallback), handle,
 * member-since line, a 2×2 summary stat grid, the read-only AniList sync widget
 * (only when connected) and the refresh / export / disconnect actions.
 *
 * The sidebar starts the local app-stats poll on mount, which no-ops outside
 * Electron, so stories stay socket-free. The sync widget reads
 * `useAniListAuthStore.status.connected`; stories seed it explicitly.
 */
const meta = {
  title: 'profile/ProfileSidebar',
  component: ProfileSidebar,
  args: {
    profile: mockUserProfile,
    isLoading: false,
    onRefresh: fn(),
    onShare: fn(),
    onDisconnect: fn(),
  },
  parameters: {
    // Named action buttons + alt-texted/fallback avatar — axe clean.
    a11y: { test: 'error' },
  },
  argTypes: {
    profile: { description: 'AniList profile rendered in the sidebar.' },
    isLoading: {
      control: 'boolean',
      description: 'Spins the refresh icon and disables the refresh button.',
    },
    onRefresh: { description: 'Fired by the Refresh profile action.' },
    onShare: { description: 'Fired by the Export card as PNG action.' },
    onDisconnect: { description: 'Fired by the Disconnect AniList action.' },
  },
  beforeEach: () => {
    useAniListAuthStore.setState(s => ({ status: { ...s.status, connected: true } }));
  },
} satisfies Meta<typeof ProfileSidebar>;

export default meta;

type Story = StoryObj<typeof ProfileSidebar>;

/** Default — handle, summary stats and the three actions, each wired to a callback. */
export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Yor')).toBeInTheDocument();
    await expect(canvas.getByText('@yor')).toBeInTheDocument();

    await userEvent.click(canvas.getByRole('button', { name: 'Refresh profile' }));
    await expect(args.onRefresh).toHaveBeenCalledTimes(1);

    await userEvent.click(canvas.getByRole('button', { name: 'Export card as PNG' }));
    await expect(args.onShare).toHaveBeenCalledTimes(1);

    await userEvent.click(canvas.getByRole('button', { name: 'Disconnect AniList' }));
    await expect(args.onDisconnect).toHaveBeenCalledTimes(1);
  },
};

/** A profile with an avatar URL — the image carries descriptive alt text. */
export const WithAvatar: Story = {
  args: {
    profile: {
      ...mockUserProfile,
      avatar: 'https://s4.anilist.co/file/anilistcdn/user/avatar/large/placeholder.png',
    } satisfies UserProfile,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('img', { name: 'Avatar of Yor' })).toBeInTheDocument();
  },
};

/** Loading — the refresh button is disabled while a refresh is in flight. */
export const Loading: Story = {
  args: { isLoading: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Refresh profile' })).toBeDisabled();
  },
};
