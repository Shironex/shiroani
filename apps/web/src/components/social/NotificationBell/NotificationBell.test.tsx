import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { useAniListAuthStore } from '@/stores/useAniListAuthStore';
import { useAniListNotificationsStore } from '@/stores/useAniListNotificationsStore';
import NotificationBell from './NotificationBell';

beforeEach(() => {
  useAniListNotificationsStore.setState({
    notifications: [],
    unreadCount: 0,
    isLoading: false,
    error: null,
  });
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
});
