import { describe, expect, it, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen } from '@/test/test-utils';
import type { AiringAnime } from '@shiroani/shared';
import { useScheduleStore } from '@/stores/useScheduleStore';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { addDays } from '../schedule-utils';
import ScheduleView from './ScheduleView';

function makeAnime(id: number, day: string, title: string): AiringAnime {
  const [y, m, d] = day.split('-').map(Number);
  return {
    id,
    airingAt: Math.floor(new Date(y, m - 1, d, 18, 0, 0).getTime() / 1000),
    episode: 3,
    media: {
      id,
      title: { romaji: title },
      coverImage: {},
      episodes: 12,
      status: 'RELEASING',
      genres: [],
      format: 'TV',
    },
  } as unknown as AiringAnime;
}

// jsdom does not implement Element.scrollTo; the daily timeline auto-scrolls to
// the live-now line on mount once entries are present.
beforeAll(() => {
  Element.prototype.scrollTo = vi.fn();
});

beforeEach(() => {
  // Stub the fetch actions so navigation/mode changes never open a socket; the
  // store's selectDay/setViewMode read these via get() at call time.
  useScheduleStore.setState({
    isLoading: false,
    error: null,
    schedule: { '2024-01-15': [] },
    viewMode: 'daily',
    selectedDay: '2024-01-15',
    onlyInLibrary: false,
    sort: 'time',
    fetchDaily: vi.fn(),
    fetchWeekly: vi.fn(),
  });
  // `loaded: true` skips the subscriptions mount effect.
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

  it('renders the seeded entries for the selected day', () => {
    useScheduleStore.setState({
      schedule: { '2024-01-15': [makeAnime(1, '2024-01-15', 'Frieren')] },
    });
    render(<ScheduleView />);
    expect(screen.getByText('Frieren')).toBeInTheDocument();
  });

  it('moves to the previous day when the previous-day nav button is clicked', async () => {
    const { user } = render(<ScheduleView />);
    await user.click(screen.getByRole('button', { name: 'Previous day' }));
    expect(useScheduleStore.getState().selectedDay).toBe(addDays('2024-01-15', -1));
  });

  it('moves to the next day when the next-day nav button is clicked', async () => {
    const { user } = render(<ScheduleView />);
    await user.click(screen.getByRole('button', { name: 'Next day' }));
    expect(useScheduleStore.getState().selectedDay).toBe(addDays('2024-01-15', 1));
  });

  it('switches to the weekly view mode from the mode switcher', async () => {
    const { user } = render(<ScheduleView />);
    // The mode tabs are tooltip buttons; weekly carries role="tab".
    await user.click(screen.getByRole('tab', { name: /Week/i }));
    expect(useScheduleStore.getState().viewMode).toBe('weekly');
  });

  it('toggles the library-only filter flag', async () => {
    const { user } = render(<ScheduleView />);
    await user.click(screen.getByRole('button', { name: 'Show only shows I track' }));
    expect(useScheduleStore.getState().onlyInLibrary).toBe(true);
  });

  it('toggles the tracked-first sort flag', async () => {
    const { user } = render(<ScheduleView />);
    await user.click(screen.getByRole('button', { name: 'Sort: tracked first' }));
    expect(useScheduleStore.getState().sort).toBe('tracked');
  });

  it('renders the error state with a retry control when the fetch fails', () => {
    useScheduleStore.setState({ error: 'network down' });
    render(<ScheduleView />);
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });
});
