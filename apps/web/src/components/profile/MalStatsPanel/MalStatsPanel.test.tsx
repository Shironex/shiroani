import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { useMalProfileStore } from '@/stores/useMalProfileStore';
import { useMalAuthStore } from '@/stores/useMalAuthStore';
import { mockMalStats } from '../profile-fixtures';
import MalStatsPanel from './MalStatsPanel';

beforeEach(() => {
  // Seed a connected profile and stub the mount fetch so no socket call runs.
  useMalProfileStore.setState({
    profile: mockMalStats,
    isLoading: false,
    error: null,
    notConnected: false,
    fetchProfile: vi.fn(),
  });
  // The not-connected effect re-resolves auth status; keep it socket-free.
  useMalAuthStore.setState({ fetchStatus: vi.fn().mockResolvedValue(undefined) });
});

describe('MalStatsPanel', () => {
  it('renders the connected MAL viewer name, breakdown rings and headline stats', () => {
    render(<MalStatsPanel />);
    expect(screen.getByText('MyAnimeList · connected')).toBeInTheDocument();
    expect(screen.getByText('By status')).toBeInTheDocument();
    // 220 completed items appears in the headline stat grid.
    expect(screen.getByText('220')).toBeInTheDocument();
  });

  it('renders the viewer handle and the open-profile action', () => {
    render(<MalStatsPanel />);
    expect(screen.getByText('Yor')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open on MAL' })).toBeInTheDocument();
  });

  it('labels the time-share bar for assistive tech', () => {
    render(<MalStatsPanel />);
    expect(
      screen.getByRole('img', { name: 'Share of days watched per list status' })
    ).toBeInTheDocument();
  });

  it('shows the loading skeleton while the first fetch is in flight', () => {
    useMalProfileStore.setState({ profile: null, isLoading: true });
    const { container } = render(<MalStatsPanel />);
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  });

  it('shows the not-connected empty state with a retry action', () => {
    useMalProfileStore.setState({ profile: null, isLoading: false, notConnected: true });
    render(<MalStatsPanel />);
    expect(screen.getByText('MyAnimeList not connected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('retriggers the fetch from the not-connected retry button', async () => {
    const fetchProfile = vi.fn();
    useMalProfileStore.setState({
      profile: null,
      isLoading: false,
      notConnected: true,
      fetchProfile,
    });
    const { user } = render(<MalStatsPanel />);
    await user.click(screen.getByRole('button', { name: /retry/i }));
    // Once on mount, once from the retry click.
    expect(fetchProfile).toHaveBeenCalledTimes(2);
  });
});
