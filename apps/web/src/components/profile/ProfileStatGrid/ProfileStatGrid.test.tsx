import { describe, expect, it } from 'vitest';
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
});
