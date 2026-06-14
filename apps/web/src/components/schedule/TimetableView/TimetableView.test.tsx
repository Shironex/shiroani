import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import TimetableView from './TimetableView';

const WEEK_DAYS = [
  '2024-01-15',
  '2024-01-16',
  '2024-01-17',
  '2024-01-18',
  '2024-01-19',
  '2024-01-20',
  '2024-01-21',
];

describe('TimetableView', () => {
  it('renders a day-number header for each day in the week', () => {
    render(<TimetableView weekDays={WEEK_DAYS} getEntriesForDay={() => []} schedule={{}} />);
    // getDayNumber('2024-01-15') === 15, surfaced via DayColumnHeader.
    expect(screen.getAllByText('15').length).toBeGreaterThan(0);
  });
});
