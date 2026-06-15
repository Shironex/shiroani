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
    expect(screen.getByText('Spy x Family')).toBeInTheDocument();
    expect(screen.getByText('Anya Forger')).toBeInTheDocument();
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
