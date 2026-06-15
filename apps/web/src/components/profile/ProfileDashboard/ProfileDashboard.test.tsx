import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { UserProfile } from '@shiroani/shared';
import { render, screen } from '@/test/test-utils';
import { useAniListAuthStore } from '@/stores/useAniListAuthStore';
import { mockUserProfile } from '../profile-fixtures';
import ProfileDashboard from './ProfileDashboard';

function renderDashboard(profile: UserProfile = mockUserProfile) {
  const onShare = vi.fn();
  const onRefresh = vi.fn();
  const onDisconnect = vi.fn();
  const utils = render(
    <ProfileDashboard
      profile={profile}
      onShare={onShare}
      onRefresh={onRefresh}
      onDisconnect={onDisconnect}
    />
  );
  return { ...utils, onShare, onRefresh, onDisconnect };
}

beforeEach(() => {
  // Disconnected so the viewer-scoped child surfaces (activity / social) don't
  // touch the socket — they render their not-connected branches instead.
  useAniListAuthStore.setState(s => ({ status: { ...s.status, connected: false } }));
});

describe('ProfileDashboard', () => {
  it('renders the sidebar, stat grid and breakdown sections', () => {
    renderDashboard();
    expect(screen.getByText('Yor')).toBeInTheDocument(); // sidebar handle
    expect(screen.getByText('Favorite genres')).toBeInTheDocument();
    expect(screen.getByText('Recent activity')).toBeInTheDocument();
    expect(screen.getByText('MAPPA')).toBeInTheDocument(); // studio breakdown
  });

  it('renders the library breakdown status rings', () => {
    renderDashboard();
    expect(screen.getByText('Library breakdown')).toBeInTheDocument();
    // The completed ring label appears beneath its ring.
    expect(screen.getAllByText('Completed').length).toBeGreaterThan(0);
  });

  it('forwards the sidebar share / refresh / disconnect actions', async () => {
    const { user, onShare, onRefresh, onDisconnect } = renderDashboard();
    await user.click(screen.getByRole('button', { name: 'Export card as PNG' }));
    expect(onShare).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Refresh profile' }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Disconnect AniList' }));
    expect(onDisconnect).toHaveBeenCalledTimes(1);
  });

  it('renders the breakdown empty hints when there is no genre/studio data', () => {
    renderDashboard({
      ...mockUserProfile,
      statistics: { ...mockUserProfile.statistics, genres: [], studios: [] },
    });
    expect(screen.getByText('No genre data yet.')).toBeInTheDocument();
    expect(screen.getByText('No studio data yet.')).toBeInTheDocument();
  });

  it('renders the activity feed connect prompt while disconnected', () => {
    renderDashboard();
    expect(
      screen.getByText('Connect an AniList account to see your activity here.')
    ).toBeInTheDocument();
  });
});
