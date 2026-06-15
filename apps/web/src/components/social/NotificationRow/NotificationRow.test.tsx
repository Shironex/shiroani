import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@/test/test-utils';
import type { AniListNotification } from '@shiroani/shared';
import NotificationRow from './NotificationRow';

const CREATED_AT = 1_717_000_000;

describe('NotificationRow', () => {
  it('renders an airing notification with a media thumb and context', () => {
    const notification: AniListNotification = {
      type: 'airing',
      id: 1,
      context: 'Episode 12 aired',
      createdAt: CREATED_AT,
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
      createdAt: CREATED_AT,
      user: { id: 9, name: 'Mochi', avatar: 'avatar.jpg' },
    };
    render(<NotificationRow notification={notification} />);

    expect(screen.getByText('Mochi started following you')).toBeInTheDocument();
    expect(screen.getByAltText('Avatar of Mochi')).toBeInTheDocument();
  });

  it('renders an activity (like) notification with a user avatar', () => {
    const notification: AniListNotification = {
      type: 'activity',
      id: 3,
      context: 'Yuki liked your activity',
      createdAt: CREATED_AT,
      activityId: 555,
      user: { id: 11, name: 'Yuki', avatar: 'yuki.jpg' },
    };
    render(<NotificationRow notification={notification} />);

    expect(screen.getByText('Yuki liked your activity')).toBeInTheDocument();
    expect(screen.getByAltText('Avatar of Yuki')).toBeInTheDocument();
  });

  it('renders a related-media notification with a media thumb', () => {
    const notification: AniListNotification = {
      type: 'related-media',
      id: 4,
      context: 'A sequel to Spy x Family was added',
      createdAt: CREATED_AT,
      media: { id: 200, title: { english: 'Spy x Family' } },
    };
    render(<NotificationRow notification={notification} />);

    expect(screen.getByText('A sequel to Spy x Family was added')).toBeInTheDocument();
    // No coverImage → media thumb falls back to the icon placeholder, no <img>.
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('falls back through the media title chain to "?" when titles are empty', () => {
    const notification: AniListNotification = {
      type: 'airing',
      id: 5,
      context: 'aired',
      createdAt: CREATED_AT,
      episode: 1,
      media: { id: 1, title: {}, coverImage: 'cover.jpg' },
    };
    render(<NotificationRow notification={notification} />);

    expect(screen.getByAltText('?')).toBeInTheDocument();
  });

  it('falls back to a placeholder when the media thumb fails to load', () => {
    const notification: AniListNotification = {
      type: 'airing',
      id: 6,
      context: 'aired',
      createdAt: CREATED_AT,
      episode: 1,
      media: { id: 1, title: { english: 'Frieren' }, coverImage: 'broken.jpg' },
    };
    render(<NotificationRow notification={notification} />);

    const thumb = screen.getByAltText('Frieren');
    fireEvent.error(thumb);
    expect(screen.queryByAltText('Frieren')).not.toBeInTheDocument();
  });

  it('falls back to a placeholder avatar when a following user has no avatar', () => {
    const notification: AniListNotification = {
      type: 'following',
      id: 7,
      context: 'Sora started following you',
      createdAt: CREATED_AT,
      user: { id: 12, name: 'Sora' },
    };
    render(<NotificationRow notification={notification} />);

    // No avatar URL → icon placeholder, no <img>.
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('Sora started following you')).toBeInTheDocument();
  });
});
