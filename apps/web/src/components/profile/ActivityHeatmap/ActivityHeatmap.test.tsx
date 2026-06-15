import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { mockAppStatsSnapshot } from '../profile-fixtures';
import ActivityHeatmap from './ActivityHeatmap';

describe('ActivityHeatmap', () => {
  it('renders a labelled grid of weekly cells', () => {
    render(<ActivityHeatmap snapshot={mockAppStatsSnapshot} weeks={12} metric="active" />);
    const grid = screen.getByRole('grid');
    expect(grid).toBeInTheDocument();
    // 12 weeks × 7 days = 84 day cells.
    expect(screen.getAllByRole('gridcell')).toHaveLength(84);
  });
});
