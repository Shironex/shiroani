import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import type { AniListNotification } from '@shiroani/shared';
import NotificationRow from './NotificationRow';

describe('NotificationRow', () => {
  it('renders an airing notification with a media thumb and context', () => {
    const notification: AniListNotification = {
      type: 'airing',
      id: 1,
      context: 'Episode 12 aired',
      createdAt: 1_717_000_000,
      episode: 12,
      media: { id: 100, title: { english: 'Frieren' }, coverImage: 'cover.jpg' },
    };
    render(<NotificationRow notification={notification} />);

    expect(screen.getByText('Episode 12 aired')).toBeInTheDocument();
    expect(screen.getByAltText('Frieren')).toBeInTheDocument();
  });

  it('renders a following notification with a user avatar (EN avatarAlt)', () => {
    const notification: AniListNotification = {
      type: 'following',
      id: 2,
      context: 'Mochi started following you',
      createdAt: 1_717_000_000,
      user: { id: 9, name: 'Mochi', avatar: 'avatar.jpg' },
    };
    render(<NotificationRow notification={notification} />);

    expect(screen.getByText('Mochi started following you')).toBeInTheDocument();
    expect(screen.getByAltText('Avatar of Mochi')).toBeInTheDocument();
  });
});
