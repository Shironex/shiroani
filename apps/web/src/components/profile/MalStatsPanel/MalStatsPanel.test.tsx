import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { useMalProfileStore } from '@/stores/useMalProfileStore';
import { mockMalStats } from '../profile-fixtures';
import MalStatsPanel from './MalStatsPanel';

beforeEach(() => {
  // Seed a connected profile and no-op the mount fetch so no socket call runs.
  useMalProfileStore.setState({
    profile: mockMalStats,
    isLoading: false,
    error: null,
    notConnected: false,
    fetchProfile: vi.fn(),
  });
});

describe('MalStatsPanel', () => {
  it('renders the connected MAL viewer name, breakdown rings and headline stats', () => {
    render(<MalStatsPanel />);
    expect(screen.getByText('MyAnimeList · connected')).toBeInTheDocument();
    expect(screen.getByText('By status')).toBeInTheDocument();
    // 220 completed items appears in the headline stat grid.
    expect(screen.getByText('220')).toBeInTheDocument();
  });
});
