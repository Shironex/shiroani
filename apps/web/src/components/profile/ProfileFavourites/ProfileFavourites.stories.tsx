import type { Meta, StoryObj } from '@storybook/react-vite';
import { mockUserProfile } from '../profile-fixtures';
import ProfileFavourites from './ProfileFavourites';

const renderHead = (label: string) => (
  <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">
    {label}
  </h3>
);

const meta = {
  title: 'profile/ProfileFavourites',
  component: ProfileFavourites,
  args: { renderHead },
} satisfies Meta<typeof ProfileFavourites>;

export default meta;

type Story = StoryObj<typeof ProfileFavourites>;

export const Default: Story = {
  args: { profile: mockUserProfile },
};
