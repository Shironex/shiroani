import { describe, expect, it } from 'vitest';
import type { AppStatsSnapshot } from '@shiroani/shared';
import { render, screen } from '@/test/test-utils';
import { mockAppStatsSnapshot } from '../profile-fixtures';
import ActivityHeatmap from './ActivityHeatmap';

/** Local YYYY-MM-DD for "today", matching the heatmap's day-bucket keys. */
function todayKey(): string {
  return new Date().toLocaleDateString('sv-SE');
}

describe('ActivityHeatmap', () => {
  it('renders a labelled grid of weekly cells', () => {
    render(<ActivityHeatmap snapshot={mockAppStatsSnapshot} weeks={12} metric="active" />);
    const grid = screen.getByRole('grid');
    expect(grid).toBeInTheDocument();
    expect(grid).toHaveAccessibleName();
    // 12 weeks × 7 days = 84 day cells.
    expect(screen.getAllByRole('gridcell')).toHaveLength(84);
  });

  it('sizes the grid to the requested number of weeks', () => {
    render(<ActivityHeatmap snapshot={mockAppStatsSnapshot} weeks={4} metric="active" />);
    expect(screen.getAllByRole('gridcell')).toHaveLength(28);
  });

  it('gives each cell an accessible label and renders the legend', () => {
    render(<ActivityHeatmap snapshot={mockAppStatsSnapshot} weeks={12} metric="active" />);
    // The legend "less … more" intensity guide is present.
    expect(screen.getByText('less')).toBeInTheDocument();
    expect(screen.getByText('more')).toBeInTheDocument();
    // Today's bucket has activity, so its cell is labelled with the active value.
    const labelled = screen.getAllByRole('gridcell').filter(c => c.getAttribute('aria-label'));
    expect(labelled).toHaveLength(84);
  });

  it('labels a day that has seeded activity with the metric value', () => {
    render(<ActivityHeatmap snapshot={mockAppStatsSnapshot} weeks={12} metric="active" />);
    // Today's bucket (5400 active seconds) yields an "actively" tooltip label.
    const active = screen.getAllByLabelText(/actively/i);
    expect(active.length).toBeGreaterThan(0);
  });

  it('labels empty days as having no activity', () => {
    const empty: AppStatsSnapshot = { ...mockAppStatsSnapshot, byDay: {} };
    render(<ActivityHeatmap snapshot={empty} weeks={12} metric="active" />);
    const noActivity = screen.getAllByLabelText(/no activity/i);
    // Most cells (all non-future days) are empty.
    expect(noActivity.length).toBeGreaterThan(60);
  });

  it('keys today off the local day bucket', () => {
    // Sanity: the fixture seeds today, so at least one cell carries an activity
    // label rather than "still ahead" / "no activity".
    expect(mockAppStatsSnapshot.byDay[todayKey()]).toBeDefined();
  });
});
