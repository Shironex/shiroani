import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import WeeklyView from './WeeklyView';

const WEEK_DAYS = [
  '2024-01-15',
  '2024-01-16',
  '2024-01-17',
  '2024-01-18',
  '2024-01-19',
  '2024-01-20',
  '2024-01-21',
];

describe('WeeklyView', () => {
  it('renders a column per weekday with its day-of-month header', () => {
    render(<WeeklyView weekDays={WEEK_DAYS} getEntriesForDay={() => []} schedule={{}} />);

    // DayColumnHeader renders getDayNumber(day) — the 15th of the first column.
    expect(screen.getAllByText('15').length).toBeGreaterThan(0);
  });
});
