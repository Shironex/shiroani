import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import type { AniListActivity } from '@shiroani/shared';
import SocialActivityRow from './SocialActivityRow';

describe('SocialActivityRow', () => {
  it('renders a text activity with its author handle and body', () => {
    const item: AniListActivity = {
      type: 'text',
      id: 1,
      text: 'Finally caught up',
      createdAt: 1_717_000_000,
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
      createdAt: 1_717_000_000,
      media: { id: 100, title: { english: 'Frieren' }, coverImage: 'cover.jpg' },
      user: { id: 9, name: 'Mochi' },
    };
    render(<SocialActivityRow item={item} />);

    expect(screen.getByText('Frieren')).toBeInTheDocument();
    expect(screen.getByText('watched episode · 12')).toBeInTheDocument();
  });
});
