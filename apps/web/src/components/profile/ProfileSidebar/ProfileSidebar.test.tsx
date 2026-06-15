import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { UserProfile } from '@shiroani/shared';
import { render, screen } from '@/test/test-utils';
import { useAniListAuthStore } from '@/stores/useAniListAuthStore';
import { mockUserProfile } from '../profile-fixtures';
import ProfileSidebar from './ProfileSidebar';

function renderSidebar(overrides: Partial<React.ComponentProps<typeof ProfileSidebar>> = {}) {
  const onRefresh = vi.fn();
  const onShare = vi.fn();
  const onDisconnect = vi.fn();
  const utils = render(
    <ProfileSidebar
      profile={mockUserProfile}
      isLoading={false}
      onRefresh={onRefresh}
      onShare={onShare}
      onDisconnect={onDisconnect}
      {...overrides}
    />
  );
  return { ...utils, onRefresh, onShare, onDisconnect };
}

beforeEach(() => {
  useAniListAuthStore.setState(s => ({ status: { ...s.status, connected: true } }));
});

describe('ProfileSidebar', () => {
  it('renders the handle and summary stats', () => {
    renderSidebar();
    expect(screen.getByText('Yor')).toBeInTheDocument();
    expect(screen.getByText('@yor')).toBeInTheDocument();
    // 312 anime count, formatted with space grouping.
    expect(screen.getByText('312')).toBeInTheDocument();
  });

  it('renders an initial fallback when the profile has no avatar', () => {
    renderSidebar();
    // No avatar in the fixture → the uppercased first letter is shown.
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('Y')).toBeInTheDocument();
  });

  it('renders the avatar image with descriptive alt text when present', () => {
    const profile: UserProfile = { ...mockUserProfile, avatar: 'https://example.test/a.png' };
    renderSidebar({ profile });
    expect(screen.getByRole('img', { name: 'Avatar of Yor' })).toBeInTheDocument();
  });

  it('fires the refresh / share / disconnect callbacks', async () => {
    const { user, onRefresh, onShare, onDisconnect } = renderSidebar();
    await user.click(screen.getByRole('button', { name: 'Refresh profile' }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Export card as PNG' }));
    expect(onShare).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Disconnect AniList' }));
    expect(onDisconnect).toHaveBeenCalledTimes(1);
  });

  it('disables the refresh button while loading', () => {
    renderSidebar({ isLoading: true });
    expect(screen.getByRole('button', { name: 'Refresh profile' })).toBeDisabled();
  });

  it('hides the sync widget when no AniList account is connected', () => {
    useAniListAuthStore.setState(s => ({ status: { ...s.status, connected: false } }));
    renderSidebar();
    expect(screen.queryByText('AniList sync')).not.toBeInTheDocument();
  });

  it('shows the sync widget heading when connected', () => {
    renderSidebar();
    expect(screen.getByText('AniList sync')).toBeInTheDocument();
  });
});
