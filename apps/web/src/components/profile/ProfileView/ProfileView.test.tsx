import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { useProfileStore } from '@/stores/useProfileStore';
import { useAniListAuthStore } from '@/stores/useAniListAuthStore';
import { useAppStatsStore } from '@/stores/useAppStatsStore';
import { mockAppStatsSnapshot, mockUserProfile } from '../profile-fixtures';
import ProfileView from './ProfileView';

beforeEach(() => {
  useProfileStore.setState({
    username: '',
    profile: null,
    mode: null,
    isLoading: false,
    error: null,
  });
  useAniListAuthStore.setState(s => ({ status: { ...s.status, connected: false } }));
  useAppStatsStore.setState({ snapshot: mockAppStatsSnapshot });
});

describe('ProfileView', () => {
  it('renders the header and the connect form once bootstrap resolves disconnected', async () => {
    render(<ProfileView />);
    expect(screen.getByText('My profile')).toBeInTheDocument();
    // Bootstrap awaits the (absent) auth bridge, then falls through to setup.
    expect(await screen.findByText('Connect your AniList profile')).toBeInTheDocument();
  });

  it('shows the AniList and In-app tabs but not MAL while MAL is disconnected', async () => {
    render(<ProfileView />);
    await screen.findByText('Connect your AniList profile');
    expect(screen.getByRole('tab', { name: 'From AniList' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'In app' })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'From MAL' })).not.toBeInTheDocument();
  });

  it('switches the body to the In-app stats panel when the app tab is selected', async () => {
    const { user } = render(<ProfileView />);
    await screen.findByText('Connect your AniList profile');
    const appTab = screen.getByRole('tab', { name: 'In app' });
    await user.click(appTab);
    expect(appTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Your time with ShiroAni')).toBeInTheDocument();
  });

  it('cycles tabs with the arrow keys', async () => {
    const { user } = render(<ProfileView />);
    await screen.findByText('Connect your AniList profile');
    const aniListTab = screen.getByRole('tab', { name: 'From AniList' });
    aniListTab.focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'In app' })).toHaveAttribute('aria-selected', 'true');
  });

  it('surfaces the error state when a fetch fails with no cached profile', async () => {
    render(<ProfileView />);
    await screen.findByText('Connect your AniList profile');
    // A failed fetch with no profile and a username surfaces the error state.
    useProfileStore.setState({ username: 'Yor', profile: null, error: 'AniList user not found' });
    expect(await screen.findByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('renders the dashboard when a populated profile is loaded', async () => {
    useProfileStore.setState({ username: 'Yor', profile: mockUserProfile, mode: 'public' });
    render(<ProfileView />);
    // The dashboard sidebar shows the handle.
    expect(await screen.findByText('@yor')).toBeInTheDocument();
    expect(screen.getByText('Favorite genres')).toBeInTheDocument();
  });

  it('shows the empty-list state for a connected viewer with zero entries', async () => {
    useProfileStore.setState({
      username: 'Yor',
      mode: 'viewer',
      profile: { ...mockUserProfile, statistics: { ...mockUserProfile.statistics, count: 0 } },
    });
    render(<ProfileView />);
    expect(
      await screen.findByText('Your AniList list is empty — add some anime to see stats here')
    ).toBeInTheDocument();
  });
});
