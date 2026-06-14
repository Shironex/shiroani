import type { Meta, StoryObj } from '@storybook/react-vite';
import { useAniListAuthStore } from '@/stores/useAniListAuthStore';
import { useAniListNotificationsStore } from '@/stores/useAniListNotificationsStore';
import NotificationBell from './NotificationBell';

const meta = {
  title: 'social/NotificationBell',
  component: NotificationBell,
} satisfies Meta<typeof NotificationBell>;

export default meta;

type Story = StoryObj<typeof NotificationBell>;

const viewer = { id: 1, name: 'Mochi' };

/**
 * The bell only renders when connected. The background unread poll fails
 * silently in Storybook (no backend), so a seeded unread count persists. Opening
 * the panel triggers a live fetch that has no backend here — panel states are
 * covered in the test, not the story.
 */
export const WithUnread: Story = {
  beforeEach: () => {
    useAniListAuthStore.setState({ status: { connected: true, viewer } });
    useAniListNotificationsStore.setState({
      unreadCount: 3,
      notifications: [],
      isLoading: false,
      error: null,
    });
  },
};

export const NoUnread: Story = {
  beforeEach: () => {
    useAniListAuthStore.setState({ status: { connected: true, viewer } });
    useAniListNotificationsStore.setState({
      unreadCount: 0,
      notifications: [],
      isLoading: false,
      error: null,
    });
  },
};
