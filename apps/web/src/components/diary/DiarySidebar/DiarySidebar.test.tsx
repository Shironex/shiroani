import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import type { DiaryEntry } from '@shiroani/shared';
import DiarySidebar from './DiarySidebar';

const today = new Date();

function dayOffset(days: number): string {
  const d = new Date(today);
  d.setDate(today.getDate() - days);
  return d.toISOString();
}

function createEntry(overrides: Partial<DiaryEntry> = {}): DiaryEntry {
  return {
    id: 1,
    title: 'Wpis',
    contentJson: JSON.stringify({ type: 'doc', content: [] }),
    createdAt: dayOffset(0),
    updatedAt: dayOffset(0),
    isPinned: false,
    ...overrides,
  };
}

describe('DiarySidebar', () => {
  it('renders the streak panel and zeroed stats with no entries', () => {
    const { container } = render(<DiarySidebar entries={[]} />);
    expect(container.querySelector('aside')).toBeInTheDocument();
    expect(screen.getByText('Current streak')).toBeInTheDocument();
    // A zero current-streak value (among several zeroed stats) is shown.
    expect(screen.getAllByText('0').length).toBeGreaterThan(0);
  });

  it('shows the heatmap empty placeholder when there is no activity', () => {
    render(<DiarySidebar entries={[]} />);
    expect(screen.getByText('No activity')).toBeInTheDocument();
  });

  it('renders the activity heatmap (not the placeholder) once there are entries', () => {
    render(<DiarySidebar entries={[createEntry()]} />);
    expect(screen.getByText('Activity · 52 weeks')).toBeInTheDocument();
    expect(screen.queryByText('No activity')).not.toBeInTheDocument();
  });

  it('counts a single entry as the total and current streak', () => {
    render(<DiarySidebar entries={[createEntry()]} />);
    expect(screen.getByText('total entries')).toBeInTheDocument();
    // One entry today → current streak of 1 day.
    expect(screen.getByText('day in a row')).toBeInTheDocument();
  });

  it('aggregates the most-used tag into the popular-tags block', () => {
    render(
      <DiarySidebar
        entries={[
          createEntry({ id: 1, tags: ['anime', 'recenzja'] }),
          createEntry({ id: 2, tags: ['anime'] }),
        ]}
      />
    );
    expect(screen.getByText('#anime · 2')).toBeInTheDocument();
    expect(screen.getByText('#recenzja · 1')).toBeInTheDocument();
  });

  it('shows the popular-tags hint when no entry is tagged', () => {
    render(<DiarySidebar entries={[createEntry({ tags: [] })]} />);
    expect(screen.getByText('Add tags to entries to track topics.')).toBeInTheDocument();
  });

  it('computes a multi-day current streak from consecutive days', () => {
    render(
      <DiarySidebar
        entries={[
          createEntry({ id: 1, createdAt: dayOffset(0) }),
          createEntry({ id: 2, createdAt: dayOffset(1) }),
          createEntry({ id: 3, createdAt: dayOffset(2) }),
        ]}
      />
    );
    // 3 consecutive days ending today → "days in a row" plural label.
    expect(screen.getByText('days in a row')).toBeInTheDocument();
  });
});
