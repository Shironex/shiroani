import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { AniListUser } from '@shiroani/shared';
import { render, screen } from '@/test/test-utils';
import { useAniListAuthStore } from '@/stores/useAniListAuthStore';
import ProfileFollow from './ProfileFollow';
import { FollowGroup, FollowError } from './ProfileFollow.parts';

const renderHead = (label: string) => <h3>{label}</h3>;

const users: AniListUser[] = [
  { id: 1, name: 'Mochi', siteUrl: 'https://anilist.co/user/Mochi', isFollowing: true },
  { id: 2, name: 'Anya', siteUrl: undefined, isFollowing: false },
];

beforeEach(() => {
  useAniListAuthStore.setState(s => ({ status: { ...s.status, connected: false } }));
});

describe('ProfileFollow', () => {
  it('renders nothing when no AniList account is connected', () => {
    const { container } = render(<ProfileFollow renderHead={renderHead} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('FollowGroup', () => {
  function renderGroup(overrides: Partial<React.ComponentProps<typeof FollowGroup>> = {}) {
    const onToggle = vi.fn();
    const utils = render(
      <FollowGroup
        label="Following"
        users={users}
        isLoading={false}
        pendingIds={new Set()}
        onToggle={onToggle}
        emptyLabel="You're not following anyone yet."
        {...overrides}
      />
    );
    return { ...utils, onToggle };
  }

  it('keeps rows collapsed until the header is clicked', async () => {
    const { user } = renderGroup();
    expect(screen.queryByText('Mochi')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Following/ }));
    expect(screen.getByText('Mochi')).toBeInTheDocument();
    expect(screen.getByText('Anya')).toBeInTheDocument();
  });

  it('fires onToggle with the user id from the row toggle', async () => {
    const { user, onToggle } = renderGroup();
    await user.click(screen.getByRole('button', { name: /Following/ }));
    await user.click(screen.getByRole('button', { name: 'Unfollow Mochi' }));
    expect(onToggle).toHaveBeenCalledWith(1);
  });

  it('exposes the follow toggle label for a not-yet-followed user', async () => {
    const { user } = renderGroup();
    await user.click(screen.getByRole('button', { name: /Following/ }));
    expect(screen.getByRole('button', { name: 'Follow Anya' })).toBeInTheDocument();
  });

  it('links a user with a siteUrl out to AniList and renders a plain name otherwise', async () => {
    const { user } = renderGroup();
    await user.click(screen.getByRole('button', { name: /Following/ }));
    expect(screen.getByRole('link', { name: 'Mochi' })).toHaveAttribute(
      'href',
      'https://anilist.co/user/Mochi'
    );
    expect(screen.queryByRole('link', { name: 'Anya' })).not.toBeInTheDocument();
  });

  it('disables a row toggle while its follow action is pending', async () => {
    const { user } = renderGroup({ pendingIds: new Set([1]) });
    await user.click(screen.getByRole('button', { name: /Following/ }));
    expect(screen.getByRole('button', { name: 'Unfollow Mochi' })).toBeDisabled();
  });

  it('shows a skeleton and a disabled header while loading', () => {
    renderGroup({ isLoading: true, users: [] });
    expect(screen.getByRole('button', { name: /Following/ })).toBeDisabled();
  });

  it('shows the empty hint and disables the header when there are no users', () => {
    renderGroup({ users: [] });
    expect(screen.getByText("You're not following anyone yet.")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Following/ })).toBeDisabled();
  });

  it('captions a full page of loaded users as "50+"', async () => {
    const many: AniListUser[] = Array.from({ length: 50 }, (_, i) => ({
      id: i + 1,
      name: `User ${i + 1}`,
      isFollowing: false,
    }));
    const { user } = renderGroup({ users: many });
    await user.click(screen.getByRole('button', { name: /Following/ }));
    expect(screen.getByText('50+ people')).toBeInTheDocument();
  });
});

describe('FollowError', () => {
  it('renders the error message and a retry button', async () => {
    const onRetry = vi.fn();
    const { user } = render(<FollowError onRetry={onRetry} />);
    expect(screen.getByText("Couldn't load your social lists.")).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
