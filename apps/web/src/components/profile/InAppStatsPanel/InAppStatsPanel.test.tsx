import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { useAppStatsStore } from '@/stores/useAppStatsStore';
import { mockAppStatsSnapshot } from '../profile-fixtures';
import InAppStatsPanel from './InAppStatsPanel';

beforeEach(() => {
  useAppStatsStore.setState({ snapshot: mockAppStatsSnapshot });
});

describe('InAppStatsPanel', () => {
  it('renders the hero tag, counter cards and the activity heatmap', () => {
    render(<InAppStatsPanel />);
    expect(screen.getByText('Your time with ShiroAni')).toBeInTheDocument();
    expect(screen.getByText('App open')).toBeInTheDocument();
    expect(screen.getByText('Activity in the last 12 weeks')).toBeInTheDocument();
    expect(screen.getByRole('grid')).toBeInTheDocument();
  });
});
