import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import DailyView from './DailyView';

describe('DailyView', () => {
  it('renders the empty-state title when there are no entries', () => {
    render(<DailyView entries={[]} day="2024-01-15" />);
    expect(screen.getByText('Nothing airs that day')).toBeInTheDocument();
  });
});
