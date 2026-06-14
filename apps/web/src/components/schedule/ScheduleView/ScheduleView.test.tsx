import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { useScheduleStore } from '@/stores/useScheduleStore';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { useLibraryStore } from '@/stores/useLibraryStore';
import ScheduleView from './ScheduleView';

beforeEach(() => {
  // Stable, non-loading, error-free empty schedule so the DailyView empty
  // state renders deterministically without a backend.
  useScheduleStore.setState({
    isLoading: false,
    error: null,
    schedule: {},
    viewMode: 'daily',
    selectedDay: '2024-01-15',
    onlyInLibrary: false,
    sort: 'time',
  });
  // `loaded: true` skips the mount effect; stub loadSubscriptions as a no-op
  // belt-and-braces in case the effect ever runs.
  useNotificationStore.setState({
    loaded: true,
    subscribedIds: new Set(),
    loadSubscriptions: vi.fn(),
  });
  useLibraryStore.setState({ entries: [] });
});

describe('ScheduleView', () => {
  it('renders the daily empty state with no schedule data', () => {
    render(<ScheduleView />);
    expect(screen.getByText('Nothing airs that day')).toBeInTheDocument();
  });
});
