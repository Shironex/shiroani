import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn, waitFor } from 'storybook/test';
import type { AniListNotification } from '@shiroani/shared';
import { useAniListAuthStore } from '@/stores/useAniListAuthStore';
import { useAniListNotificationsStore } from '@/stores/useAniListNotificationsStore';
import NotificationBell from './NotificationBell';

const CREATED_AT = 1_717_000_000;
const viewer = { id: 1, name: 'Mochi' };

const notifications: AniListNotification[] = [
  {
    type: 'following',
    id: 1,
    context: 'Mochi started following you.',
    createdAt: CREATED_AT,
    user: { id: 9, name: 'Mochi' },
  },
  {
    type: 'airing',
    id: 2,
    context: 'Episode 12 of Frieren aired.',
    createdAt: CREATED_AT,
    episode: 12,
    media: { id: 100, title: { english: 'Frieren' } },
  },
];

/**
 * Stub the store's async actions to no-ops. The mount effect starts background
 * unread-count polling and opening the panel fetches + marks-read — all emit
 * over the socket, which would reconnect forever against the dead test backend
 * and hang the headless Chromium page. No-op actions keep every story
 * deterministically socket-free.
 */
function stubActions() {
  useAniListNotificationsStore.setState({
    refreshUnreadCount: fn().mockResolvedValue(undefined),
    fetchNotifications: fn().mockResolvedValue(undefined),
    markAllRead: fn().mockResolvedValue(undefined),
  });
}

/**
 * Global AniList notifications bell that lives in the TitleBar chrome: an icon
 * button with an unread badge that opens a click-away dropdown panel (a
 * `role="dialog"`). Renders nothing when disconnected. The store is seeded per
 * story; its socket-touching actions are stubbed so the bell never opens a
 * connection.
 */
const meta = {
  title: 'social/NotificationBell',
  component: NotificationBell,
  parameters: {
    // The bell button and panel chrome (close button, dialog label) carry
    // accessible names, so axe passes clean.
    a11y: { test: 'error' },
  },
} satisfies Meta<typeof NotificationBell>;

export default meta;

type Story = StoryObj<typeof NotificationBell>;

/** Connected with unread notifications — the badge shows the capped count. */
export const WithUnread: Story = {
  beforeEach: () => {
    useAniListAuthStore.setState({ status: { connected: true, viewer } });
    useAniListNotificationsStore.setState({
      unreadCount: 3,
      notifications: [],
      isLoading: false,
      error: null,
    });
    stubActions();
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const bell = canvas.getByRole('button', { name: 'Notifications, 3 unread' });
    await expect(bell).toBeInTheDocument();
    await expect(bell).toHaveAttribute('aria-expanded', 'false');
    await expect(canvas.getByText('3')).toBeInTheDocument();
  },
};

/** Connected with everything read — the badge is absent. */
export const NoUnread: Story = {
  beforeEach: () => {
    useAniListAuthStore.setState({ status: { connected: true, viewer } });
    useAniListNotificationsStore.setState({
      unreadCount: 0,
      notifications: [],
      isLoading: false,
      error: null,
    });
    stubActions();
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Notifications' })).toBeInTheDocument();
    await expect(canvas.queryByText('0')).not.toBeInTheDocument();
  },
};

/**
 * Opening the bell reveals the dropdown panel (a `role="dialog"`) with the
 * seeded notification rows; closing it from the panel's Close button dismisses
 * it again.
 */
export const OpenPanel: Story = {
  beforeEach: () => {
    useAniListAuthStore.setState({ status: { connected: true, viewer } });
    useAniListNotificationsStore.setState({
      unreadCount: 2,
      notifications,
      isLoading: false,
      error: null,
    });
    stubActions();
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /Notifications/ }));

    // The panel is fixed-positioned within the same root; query the canvas body.
    const body = within(canvasElement.ownerDocument.body);
    const dialog = await body.findByRole('dialog', { name: 'Notifications' });
    await expect(dialog).toBeInTheDocument();
    await expect(body.getByText('Mochi started following you.')).toBeInTheDocument();
    await expect(body.getByText('Episode 12 of Frieren aired.')).toBeInTheDocument();

    // Close from the panel's Close button so the bell isn't behind an open
    // dialog when the a11y check runs after play.
    await userEvent.click(body.getByRole('button', { name: 'Close' }));
    await waitFor(() =>
      expect(body.queryByRole('dialog', { name: 'Notifications' })).not.toBeInTheDocument()
    );
  },
};

/** The panel's empty state — connected, no notifications. */
export const EmptyPanel: Story = {
  beforeEach: () => {
    useAniListAuthStore.setState({ status: { connected: true, viewer } });
    useAniListNotificationsStore.setState({
      unreadCount: 0,
      notifications: [],
      isLoading: false,
      error: null,
    });
    stubActions();
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Notifications' }));

    const body = within(canvasElement.ownerDocument.body);
    await body.findByRole('dialog', { name: 'Notifications' });
    await expect(body.getByText(/You're all caught up/i)).toBeInTheDocument();

    await userEvent.click(body.getByRole('button', { name: 'Close' }));
    await waitFor(() =>
      expect(body.queryByRole('dialog', { name: 'Notifications' })).not.toBeInTheDocument()
    );
  },
};
