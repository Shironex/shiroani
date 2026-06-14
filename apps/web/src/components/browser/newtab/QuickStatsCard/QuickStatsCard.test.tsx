import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import QuickStatsCard from './QuickStatsCard';

describe('QuickStatsCard', () => {
  it('renders the quick-stats section with its three stat tiles', () => {
    render(<QuickStatsCard />);

    expect(screen.getByText('Episodes')).toBeInTheDocument();
    expect(screen.getByText('In library')).toBeInTheDocument();
    expect(screen.getByText('Streak')).toBeInTheDocument();
  });
});
