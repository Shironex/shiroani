import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { toLocalDate } from '@shiroani/shared';
import DayColumnHeader from './DayColumnHeader';

describe('DayColumnHeader', () => {
  it('renders the label and day-of-month number for a non-today date', () => {
    render(<DayColumnHeader day="2000-01-01" label="MON" entryCount={3} />);
    expect(screen.getByText('MON')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('shows the episode-count line when there are entries', () => {
    render(<DayColumnHeader day="2000-01-01" label="MON" entryCount={3} />);
    expect(screen.getByText(/3/)).toBeInTheDocument();
    expect(screen.getByText(/ep\./)).toBeInTheDocument();
  });

  it('omits the episode-count line when there are no entries', () => {
    render(<DayColumnHeader day="2000-01-01" label="MON" entryCount={0} />);
    expect(screen.queryByText(/ep\./)).not.toBeInTheDocument();
  });

  it('appends the "today" suffix for the current calendar day', () => {
    const today = toLocalDate(new Date());
    render(<DayColumnHeader day={today} label="WED" entryCount={1} />);
    expect(screen.getByText(/today/i)).toBeInTheDocument();
  });
});
