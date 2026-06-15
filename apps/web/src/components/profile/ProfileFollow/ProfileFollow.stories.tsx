import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn, waitFor } from 'storybook/test';
import type { AniListUser } from '@shiroani/shared';
import { FollowGroup } from './ProfileFollow.parts';
import ProfileFollow from './ProfileFollow';

const renderHead = (label: string) => (
  <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">
    {label}
  </h3>
);

const users: AniListUser[] = [
  {
    id: 1,
    name: 'Mochi',
    avatar: undefined,
    siteUrl: 'https://anilist.co/user/Mochi',
    isFollowing: true,
  },
  { id: 2, name: 'Anya', avatar: undefined, siteUrl: undefined, isFollowing: false },
];

/**
 * Following / Followers surface for the connected viewer. The whole section is
 * viewer-scoped (resolved from the OAuth token via `useSocialGraph`), so it
 * renders nothing without a connected account — that data isn't store-seedable,
 * so the connected/interactive states are exercised through its `FollowGroup`
 * part below (and in unit tests) rather than at the `ProfileFollow` level, which
 * would open a socket on mount.
 */
const meta = {
  title: 'profile/ProfileFollow',
  component: ProfileFollow,
  args: { renderHead },
  parameters: {
    a11y: { test: 'error' },
  },
  argTypes: {
    renderHead: { description: 'Render-prop for the shared dashboard section heading.' },
  },
} satisfies Meta<typeof ProfileFollow>;

export default meta;

type Story = StoryObj<typeof ProfileFollow>;

/**
 * Disconnected — the social graph is viewer-scoped, so with no connected AniList
 * account the section renders nothing (rather than an empty list that would read
 * as a bug on a public profile).
 */
export const NotConnected: Story = {
  play: async ({ canvasElement }) => {
    // Nothing renders; the canvas host has no section content.
    await expect(within(canvasElement).queryByText('Following')).not.toBeInTheDocument();
  },
};

/**
 * The collapsible follow group in isolation — fully prop-driven (no socket).
 * Expanding reveals the user rows; toggling a row fires `onToggle(user.id)`.
 */
export const GroupExpandAndToggle: StoryObj<typeof FollowGroup> = {
  render: args => <FollowGroup {...args} />,
  args: {
    label: 'Following',
    users,
    isLoading: false,
    pendingIds: new Set<number>(),
    onToggle: fn(),
    emptyLabel: "You're not following anyone yet.",
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    // Collapsed: rows hidden behind the count header.
    await expect(canvas.queryByText('Mochi')).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: /Following/ }));
    await waitFor(() => expect(canvas.getByText('Mochi')).toBeInTheDocument());
    // Following Mochi → the unfollow toggle is exposed by accessible name.
    await userEvent.click(canvas.getByRole('button', { name: 'Unfollow Mochi' }));
    await expect(args.onToggle).toHaveBeenCalledWith(1);
  },
};

/** An empty follow group shows the muted empty hint and stays non-expandable. */
export const GroupEmpty: StoryObj<typeof FollowGroup> = {
  render: args => <FollowGroup {...args} />,
  args: {
    label: 'Followers',
    users: [],
    isLoading: false,
    pendingIds: new Set<number>(),
    onToggle: fn(),
    emptyLabel: 'No followers yet.',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('No followers yet.')).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: /Followers/ })).toBeDisabled();
  },
};
