import { describe, expect, it, beforeEach } from 'vitest';
import type { AppStatsSnapshot } from '@shiroani/shared';
import { render, screen } from '@/test/test-utils';
import { useAppStatsStore } from '@/stores/useAppStatsStore';
import { mockAppStatsSnapshot } from '../profile-fixtures';
import InAppStatsPanel from './InAppStatsPanel';

const EMPTY_SNAPSHOT: AppStatsSnapshot = {
  version: 1,
  createdAt: null,
  totals: { appOpenSeconds: 0, appActiveSeconds: 0, animeWatchSeconds: 0, sessionCount: 0 },
  byDay: {},
  currentStreak: { days: 0, lastDay: null },
  longestStreak: { days: 0, lastDay: null },
};

beforeEach(() => {
  useAppStatsStore.setState({ snapshot: mockAppStatsSnapshot });
});

describe('InAppStatsPanel', () => {
  it('renders the hero tag, counter cards and the activity heatmap', () => {
    render(<InAppStatsPanel />);
    expect(screen.getByText('Your time with ShiroAni')).toBeInTheDocument();
    expect(screen.getByText('App open')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('With anime')).toBeInTheDocument();
    expect(screen.getByText('Activity in the last 12 weeks')).toBeInTheDocument();
    expect(screen.getByRole('grid')).toBeInTheDocument();
  });

  it('renders the streak strip when there is a current streak', () => {
    render(<InAppStatsPanel />);
    expect(screen.getByText('Current streak')).toBeInTheDocument();
    expect(screen.getByText('Longest streak')).toBeInTheDocument();
  });

  it('omits the streak strip when there is no current streak', () => {
    useAppStatsStore.setState({
      snapshot: { ...mockAppStatsSnapshot, currentStreak: { days: 0, lastDay: null } },
    });
    render(<InAppStatsPanel />);
    expect(screen.queryByText('Current streak')).not.toBeInTheDocument();
  });

  it('opens the confirm dialog from the clear-stats action', async () => {
    const { user } = render(<InAppStatsPanel />);
    expect(screen.queryByText('Clear stats?')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear stats' }));
    expect(screen.getByText('Clear stats?')).toBeInTheDocument();
  });

  it('closes the confirm dialog on cancel', async () => {
    const { user } = render(<InAppStatsPanel />);
    await user.click(screen.getByRole('button', { name: 'Clear stats' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByText('Clear stats?')).not.toBeInTheDocument();
  });

  it('renders the empty hero copy when the tracker has no data', () => {
    useAppStatsStore.setState({ snapshot: EMPTY_SNAPSHOT });
    render(<InAppStatsPanel />);
    expect(
      screen.getByText('Your journey is just beginning · stay a little longer')
    ).toBeInTheDocument();
  });
});
