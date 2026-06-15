import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@/test/test-utils';
import type { AniListNotification } from '@shiroani/shared';
import { useAniListAuthStore } from '@/stores/useAniListAuthStore';
import { useAniListNotificationsStore } from '@/stores/useAniListNotificationsStore';
import NotificationBell from './NotificationBell';

// The bell's mount effect starts background polling, and opening the panel
// fetches + marks-read — all of which emit over the socket. Stub the store's
// async actions to no-ops so the unit tests never touch the (uninitialized)
// socket and stay deterministic.
function stubActions() {
  useAniListNotificationsStore.setState({
    refreshUnreadCount: vi.fn().mockResolvedValue(undefined),
    fetchNotifications: vi.fn().mockResolvedValue(undefined),
    markAllRead: vi.fn().mockResolvedValue(undefined),
  });
}

beforeEach(() => {
  useAniListNotificationsStore.setState({
    notifications: [],
    unreadCount: 0,
    isLoading: false,
    error: null,
  });
  stubActions();
});

describe('NotificationBell', () => {
  it('renders nothing when disconnected', () => {
    useAniListAuthStore.setState({ status: { connected: false } });
    const { container } = render(<NotificationBell />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the bell with an unread badge when connected', () => {
    useAniListAuthStore.setState({ status: { connected: true } });
    useAniListNotificationsStore.setState({ unreadCount: 3 });
    render(<NotificationBell />);

    expect(screen.getByRole('button', { name: 'Notifications, 3 unread' })).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders the bell without a badge when there are no unread notifications', () => {
    useAniListAuthStore.setState({ status: { connected: true } });
    useAniListNotificationsStore.setState({ unreadCount: 0 });
    render(<NotificationBell />);

    expect(screen.getByRole('button', { name: 'Notifications' })).toBeInTheDocument();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('caps the badge at 99+ for large unread counts', () => {
    useAniListAuthStore.setState({ status: { connected: true } });
    useAniListNotificationsStore.setState({ unreadCount: 250 });
    render(<NotificationBell />);

    expect(screen.getByText('99+')).toBeInTheDocument();
    expect(screen.queryByText('250')).not.toBeInTheDocument();
  });

  it('opens the panel on click and fetches then marks all read', async () => {
    useAniListAuthStore.setState({ status: { connected: true } });
    useAniListNotificationsStore.setState({ unreadCount: 2 });
    const fetchNotifications = vi.fn().mockResolvedValue(undefined);
    const markAllRead = vi.fn().mockResolvedValue(undefined);
    useAniListNotificationsStore.setState({ fetchNotifications, markAllRead });

    const { user } = render(<NotificationBell />);
    const bell = screen.getByRole('button', { name: 'Notifications, 2 unread' });
    expect(bell).toHaveAttribute('aria-expanded', 'false');

    await user.click(bell);

    // The panel is a role="dialog" that portals into the same container.
    expect(screen.getByRole('dialog', { name: 'Notifications' })).toBeInTheDocument();
    expect(bell).toHaveAttribute('aria-expanded', 'true');
    expect(fetchNotifications).toHaveBeenCalledTimes(1);
    // GET must settle before markAllRead zeroes the badge.
    await waitFor(() => expect(markAllRead).toHaveBeenCalledTimes(1));
  });

  it('toggles the panel closed on a second click', async () => {
    useAniListAuthStore.setState({ status: { connected: true } });
    useAniListNotificationsStore.setState({ unreadCount: 1 });

    const { user } = render(<NotificationBell />);
    const bell = screen.getByRole('button', { name: /Notifications/ });

    await user.click(bell);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.click(bell);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(bell).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes the panel on Escape', async () => {
    useAniListAuthStore.setState({ status: { connected: true } });
    useAniListNotificationsStore.setState({ unreadCount: 1 });

    const { user } = render(<NotificationBell />);
    await user.click(screen.getByRole('button', { name: /Notifications/ }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('closes the panel from the panel close button', async () => {
    useAniListAuthStore.setState({ status: { connected: true } });
    useAniListNotificationsStore.setState({ unreadCount: 1 });

    const { user } = render(<NotificationBell />);
    await user.click(screen.getByRole('button', { name: /Notifications/ }));

    await user.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('renders seeded notification rows inside the open panel', async () => {
    useAniListAuthStore.setState({ status: { connected: true } });
    const notifications: AniListNotification[] = [
      {
        type: 'following',
        id: 2,
        context: 'Mochi started following you',
        createdAt: 1_717_000_000,
        user: { id: 9, name: 'Mochi' },
      },
    ];
    useAniListNotificationsStore.setState({ unreadCount: 1, notifications });

    const { user } = render(<NotificationBell />);
    await user.click(screen.getByRole('button', { name: /Notifications/ }));

    expect(screen.getByText('Mochi started following you')).toBeInTheDocument();
  });

  it('renders the empty panel state when there are no notifications', async () => {
    useAniListAuthStore.setState({ status: { connected: true } });
    useAniListNotificationsStore.setState({ unreadCount: 0, notifications: [] });

    const { user } = render(<NotificationBell />);
    await user.click(screen.getByRole('button', { name: 'Notifications' }));

    expect(screen.getByText(/You're all caught up/i)).toBeInTheDocument();
  });

  it('renders the panel error state with a retry that refetches', async () => {
    useAniListAuthStore.setState({ status: { connected: true } });
    useAniListNotificationsStore.setState({ unreadCount: 0, error: 'boom' });
    const fetchNotifications = vi.fn().mockResolvedValue(undefined);
    useAniListNotificationsStore.setState({ fetchNotifications });

    const { user } = render(<NotificationBell />);
    await user.click(screen.getByRole('button', { name: 'Notifications' }));

    expect(screen.getByText(/Couldn't load notifications/i)).toBeInTheDocument();
    // The open already fired one fetch; retry fires another.
    const before = fetchNotifications.mock.calls.length;
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(fetchNotifications.mock.calls.length).toBe(before + 1);
  });
});
