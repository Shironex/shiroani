import { describe, expect, it } from 'vitest';
import type { UserProfile } from '@shiroani/shared';
import { render, screen } from '@/test/test-utils';
import { mockUserProfile } from '../profile-fixtures';
import ProfileFavourites from './ProfileFavourites';

const renderHead = (label: string) => <h3>{label}</h3>;

describe('ProfileFavourites', () => {
  it('renders only the buckets that have entries', () => {
    render(<ProfileFavourites profile={mockUserProfile} renderHead={renderHead} />);
    // Fixture has anime, characters and studios favourites; no manga/staff.
    expect(screen.getByText('Favorite anime')).toBeInTheDocument();
    expect(screen.getByText('Favorite characters')).toBeInTheDocument();
    expect(screen.getByText('Favorite studios')).toBeInTheDocument();
    expect(screen.queryByText('Favorite manga')).not.toBeInTheDocument();
    expect(screen.queryByText('Favorite staff')).not.toBeInTheDocument();
    expect(screen.getByText('Spy x Family')).toBeInTheDocument();
    expect(screen.getByText('Anya Forger')).toBeInTheDocument();
    expect(screen.getByText('Wit Studio')).toBeInTheDocument();
  });

  it('labels a favourite anime poster with its title for screen readers', () => {
    const profile: UserProfile = {
      ...mockUserProfile,
      favourites: [
        { id: 101, title: { english: 'Spy x Family' }, coverImage: 'https://example.test/sxf.png' },
      ],
    };
    render(<ProfileFavourites profile={profile} renderHead={renderHead} />);
    expect(screen.getByRole('img', { name: 'Spy x Family' })).toBeInTheDocument();
  });

  it('falls back to a placeholder icon when a favourite has no cover image', () => {
    render(<ProfileFavourites profile={mockUserProfile} renderHead={renderHead} />);
    // The fixture's Spy x Family has no cover → no <img>, just the title text.
    expect(screen.queryByRole('img', { name: 'Spy x Family' })).not.toBeInTheDocument();
    expect(screen.getByText('Spy x Family')).toBeInTheDocument();
  });

  it('falls back to a romaji title when english is absent', () => {
    const profile: UserProfile = {
      ...mockUserProfile,
      favourites: [{ id: 9, title: { romaji: 'Sousou no Frieren' }, coverImage: undefined }],
      favouritesCharacters: [],
      favouritesStudios: [],
    };
    render(<ProfileFavourites profile={profile} renderHead={renderHead} />);
    expect(screen.getByText('Sousou no Frieren')).toBeInTheDocument();
  });

  it('renders nothing when the account has no favourites', () => {
    const empty: UserProfile = {
      ...mockUserProfile,
      favourites: [],
      favouritesManga: [],
      favouritesCharacters: [],
      favouritesStaff: [],
      favouritesStudios: [],
    };
    const { container } = render(<ProfileFavourites profile={empty} renderHead={renderHead} />);
    expect(container).toBeEmptyDOMElement();
  });
});
