import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@/test/test-utils';
import type { AniListActivity } from '@shiroani/shared';
import SocialActivityRow from './SocialActivityRow';

const CREATED_AT = 1_717_000_000;

describe('SocialActivityRow', () => {
  it('renders a text activity with its author handle and body', () => {
    const item: AniListActivity = {
      type: 'text',
      id: 1,
      text: 'Finally caught up',
      createdAt: CREATED_AT,
      user: { id: 9, name: 'Mochi' },
    };
    render(<SocialActivityRow item={item} />);

    expect(screen.getByText('Mochi')).toBeInTheDocument();
    expect(screen.getByText('Finally caught up')).toBeInTheDocument();
  });

  it('renders a list activity with the media title and status line', () => {
    const item: AniListActivity = {
      type: 'list',
      id: 2,
      status: 'watched episode',
      progress: '12',
      createdAt: CREATED_AT,
      media: { id: 100, title: { english: 'Frieren' }, coverImage: 'cover.jpg' },
      user: { id: 9, name: 'Mochi' },
    };
    render(<SocialActivityRow item={item} />);

    expect(screen.getByText('Frieren')).toBeInTheDocument();
    expect(screen.getByText('watched episode · 12')).toBeInTheDocument();
    expect(screen.getByAltText('Frieren')).toBeInTheDocument();
  });

  it('joins only the present status/progress segments', () => {
    const item: AniListActivity = {
      type: 'list',
      id: 3,
      status: 'completed',
      createdAt: CREATED_AT,
      media: { id: 200, title: { english: 'Spy x Family' } },
      user: { id: 9, name: 'Mochi' },
    };
    render(<SocialActivityRow item={item} />);

    // No progress → no " · " separator.
    expect(screen.getByText('completed')).toBeInTheDocument();
    expect(screen.queryByText(/·/)).not.toBeInTheDocument();
  });

  it('falls back through the title chain (romaji, then native, then "?")', () => {
    const romaji: AniListActivity = {
      type: 'list',
      id: 4,
      status: 'reading',
      createdAt: CREATED_AT,
      media: { id: 1, title: { romaji: 'Sousou no Frieren' } },
    };
    const { rerender } = render(<SocialActivityRow item={romaji} />);
    expect(screen.getByText('Sousou no Frieren')).toBeInTheDocument();

    const empty: AniListActivity = {
      type: 'list',
      id: 5,
      status: 'reading',
      createdAt: CREATED_AT,
      media: { id: 2, title: {} },
    };
    rerender(<SocialActivityRow item={empty} />);
    expect(screen.getByText('?')).toBeInTheDocument();
  });

  it('renders a list activity without an author (placeholder avatar, no handle)', () => {
    const item: AniListActivity = {
      type: 'list',
      id: 6,
      status: 'completed',
      createdAt: CREATED_AT,
      media: { id: 300, title: { english: 'Spy x Family' } },
    };
    render(<SocialActivityRow item={item} />);

    // No author handle and no avatar <img> when user is absent.
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('Spy x Family')).toBeInTheDocument();
  });

  it('shows the author avatar image when the author has one', () => {
    const item: AniListActivity = {
      type: 'text',
      id: 7,
      text: 'hi',
      createdAt: CREATED_AT,
      user: { id: 9, name: 'Mochi', avatar: 'avatar.jpg' },
    };
    render(<SocialActivityRow item={item} />);

    expect(screen.getByAltText('Avatar of Mochi')).toBeInTheDocument();
  });

  it('falls back to a placeholder when the poster image fails to load', () => {
    const item: AniListActivity = {
      type: 'list',
      id: 8,
      status: 'completed',
      createdAt: CREATED_AT,
      media: { id: 400, title: { english: 'Frieren' }, coverImage: 'broken.jpg' },
    };
    render(<SocialActivityRow item={item} />);

    const poster = screen.getByAltText('Frieren');
    fireEvent.error(poster);
    // After the load error the <img> is replaced by the icon placeholder.
    expect(screen.queryByAltText('Frieren')).not.toBeInTheDocument();
  });
});
