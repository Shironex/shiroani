import { describe, expect, it } from 'vitest';
import type { UserProfile } from '@shiroani/shared';
import { render, screen } from '@/test/test-utils';
import { mockUserProfile } from '../profile-fixtures';
import ProfileStatGrid from './ProfileStatGrid';

describe('ProfileStatGrid', () => {
  it('renders the completed / current / planning counts and mean score', () => {
    render(<ProfileStatGrid profile={mockUserProfile} />);
    expect(screen.getByText('220')).toBeInTheDocument(); // completed
    expect(screen.getByText('24')).toBeInTheDocument(); // current
    expect(screen.getByText('48')).toBeInTheDocument(); // planning
    expect(screen.getByText('7.8')).toBeInTheDocument(); // mean score
  });

  it('renders the localized stat labels', () => {
    render(<ProfileStatGrid profile={mockUserProfile} />);
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Watching')).toBeInTheDocument();
    expect(screen.getByText('Planning')).toBeInTheDocument();
    expect(screen.getByText('Avg. score')).toBeInTheDocument();
  });

  it('falls back to zero for missing status buckets', () => {
    const sparse: UserProfile = {
      ...mockUserProfile,
      statistics: { ...mockUserProfile.statistics, statuses: [] },
    };
    render(<ProfileStatGrid profile={sparse} />);
    // completed / current / planning all default to 0.
    expect(screen.getAllByText('0')).toHaveLength(3);
  });

  it('renders an em dash for a zero mean score', () => {
    const noScore: UserProfile = {
      ...mockUserProfile,
      statistics: { ...mockUserProfile.statistics, meanScore: 0 },
    };
    render(<ProfileStatGrid profile={noScore} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
