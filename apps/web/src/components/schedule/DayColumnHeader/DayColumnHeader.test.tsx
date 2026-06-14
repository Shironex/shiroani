import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import DayColumnHeader from './DayColumnHeader';

describe('DayColumnHeader', () => {
  it('renders the label and day-of-month number for a non-today date', () => {
    render(<DayColumnHeader day="2000-01-01" label="MON" entryCount={3} />);
    expect(screen.getByText('MON')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });
});
