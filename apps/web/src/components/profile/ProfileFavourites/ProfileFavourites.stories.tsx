import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, expect } from 'storybook/test';
import type { UserProfile } from '@shiroani/shared';
import { mockUserProfile } from '../profile-fixtures';
import ProfileFavourites from './ProfileFavourites';

const renderHead = (label: string) => (
  <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">
    {label}
  </h3>
);

/**
 * All-type favourites surface — anime, manga, characters, staff and studios.
 * Each bucket renders only when AniList exposed it; missing covers fall back to
 * a placeholder icon. The whole section is omitted when the account has no
 * favourites at all.
 */
const meta = {
  title: 'profile/ProfileFavourites',
  component: ProfileFavourites,
  args: { renderHead },
  parameters: {
    // Poster cards carry alt text from the title; studio pills are plain text.
    a11y: { test: 'error' },
  },
  argTypes: {
    profile: { description: 'AniList profile; its favourites buckets gate each sub-row.' },
    renderHead: { description: 'Render-prop for the shared dashboard section heading.' },
  },
} satisfies Meta<typeof ProfileFavourites>;

export default meta;

type Story = StoryObj<typeof ProfileFavourites>;

/** The fixture has anime, characters and studios favourites; no manga/staff. */
export const Default: Story = {
  args: { profile: mockUserProfile },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Favorite anime')).toBeInTheDocument();
    await expect(canvas.getByText('Favorite characters')).toBeInTheDocument();
    await expect(canvas.getByText('Favorite studios')).toBeInTheDocument();
    await expect(canvas.getByText('Spy x Family')).toBeInTheDocument();
    await expect(canvas.getByText('Anya Forger')).toBeInTheDocument();
    // No manga/staff buckets in the fixture.
    await expect(canvas.queryByText('Favorite manga')).not.toBeInTheDocument();
  },
};

/** No favourites in any bucket — the section renders nothing. */
export const Empty: Story = {
  args: {
    profile: {
      ...mockUserProfile,
      favourites: [],
      favouritesManga: [],
      favouritesCharacters: [],
      favouritesStaff: [],
      favouritesStudios: [],
    } satisfies UserProfile,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByText('Favorite anime')).not.toBeInTheDocument();
  },
};
