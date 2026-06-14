import { describe, expect, it } from 'vitest';
import { render } from '@/test/test-utils';
import { DailyViewSkeleton, WeeklyViewSkeleton, TimetableViewSkeleton } from './ScheduleSkeletons';

describe('ScheduleSkeletons', () => {
  it('renders the daily skeleton in a busy state', () => {
    const { container } = render(<DailyViewSkeleton />);
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  });

  it('renders the weekly skeleton in a busy state', () => {
    const { container } = render(<WeeklyViewSkeleton />);
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  });

  it('renders the timetable skeleton in a busy state', () => {
    const { container } = render(<TimetableViewSkeleton />);
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  });
});
