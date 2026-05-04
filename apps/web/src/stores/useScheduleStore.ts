import { create } from 'zustand';
import { maybeDevtools } from '@/stores/utils/maybeDevtools';
import {
  type SocketStoreSlice,
  initialSocketState,
  createSocketActions,
  createSocketListeners,
} from '@/stores/utils/createSocketStore';
import {
  type AiringAnime,
  ScheduleEvents,
  toLocalDate,
  getWeekStart,
  createLogger,
} from '@shiroani/shared';
import { emitWithErrorHandling } from '@/lib/socket';

const logger = createLogger('ScheduleStore');

/**
 * Schedule store state
 */
interface ScheduleState extends SocketStoreSlice {
  /** Airing schedule grouped by ISO date string */
  schedule: Record<string, AiringAnime[]>;
  /** Currently selected day (ISO date string YYYY-MM-DD) */
  selectedDay: string;
  /** View mode: daily, weekly list, or timetable grid */
  viewMode: 'daily' | 'weekly' | 'timetable';
  /** Filter to show only anime in user's library */
  onlyInLibrary: boolean;
}

/**
 * Schedule store actions
 */
interface ScheduleActions {
  selectDay: (day: string) => void;
  setViewMode: (mode: 'daily' | 'weekly' | 'timetable') => void;
  toggleLibraryFilter: () => void;
  fetchDaily: (date: string) => void;
  fetchWeekly: (startDate: string) => void;
  getEntriesForDay: (day: string) => AiringAnime[];
  getWeekDays: () => string[];
  initListeners: () => void;
  cleanupListeners: () => void;
}

type ScheduleStore = ScheduleState & ScheduleActions;

function getWeekStartStr(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  return toLocalDate(getWeekStart(new Date(year, month - 1, day)));
}

export const useScheduleStore = create<ScheduleStore>()(
  maybeDevtools(
    (set, get) => {
      const socketActions = createSocketActions<ScheduleStore>(set, 'schedule');

      const { initListeners, cleanupListeners } = createSocketListeners<ScheduleStore>(
        get,
        set,
        'schedule',
        {
          listeners: [
            {
              event: ScheduleEvents.DAILY_RESULT,
              handler: data => {
                const result = data as { date: string; entries: AiringAnime[] };
                set(
                  state => ({
                    schedule: {
                      ...state.schedule,
                      [result.date]: result.entries,
                    },
                    isLoading: false,
                  }),
                  undefined,
                  'schedule/dailyResult'
                );
              },
            },
            {
              event: ScheduleEvents.WEEKLY_RESULT,
              handler: data => {
                const result = data as { schedule: Record<string, AiringAnime[]> };
                set(
                  state => ({
                    schedule: {
                      ...state.schedule,
                      ...result.schedule,
                    },
                    isLoading: false,
                  }),
                  undefined,
                  'schedule/weeklyResult'
                );
              },
            },
          ],
          onConnect: () => {
            const { selectedDay, viewMode } = get();
            if (viewMode === 'daily') {
              get().fetchDaily(selectedDay);
            } else {
              // Both 'weekly' and 'timetable' use weekly data
              get().fetchWeekly(getWeekStartStr(selectedDay));
            }
          },
        }
      );

      return {
        // State
        ...initialSocketState,
        schedule: {},
        selectedDay: toLocalDate(new Date()),
        viewMode: 'daily',
        onlyInLibrary: false,

        // Socket actions
        ...socketActions,

        // Actions
        selectDay: (day: string) => {
          set({ selectedDay: day }, undefined, 'schedule/selectDay');
          const { viewMode } = get();
          if (viewMode === 'daily') {
            get().fetchDaily(day);
          } else {
            get().fetchWeekly(getWeekStartStr(day));
          }
        },

        setViewMode: (mode: 'daily' | 'weekly' | 'timetable') => {
          set({ viewMode: mode }, undefined, 'schedule/setViewMode');
          const { selectedDay } = get();
          if (mode === 'daily') {
            get().fetchDaily(selectedDay);
          } else {
            get().fetchWeekly(getWeekStartStr(selectedDay));
          }
        },

        toggleLibraryFilter: () => {
          set({ onlyInLibrary: !get().onlyInLibrary }, undefined, 'schedule/toggleLibraryFilter');
        },

        fetchDaily: (date: string) => {
          set({ isLoading: true }, undefined, 'schedule/fetchingDaily');
          emitWithErrorHandling(ScheduleEvents.GET_DAILY, { date }).catch((err: Error) => {
            logger.error('Failed to fetch daily schedule:', err.message);
            set({ isLoading: false, error: err.message }, undefined, 'schedule/fetchDailyError');
          });
        },

        fetchWeekly: (startDate: string) => {
          set({ isLoading: true }, undefined, 'schedule/fetchingWeekly');
          emitWithErrorHandling(ScheduleEvents.GET_WEEKLY, { startDate }).catch((err: Error) => {
            logger.error('Failed to fetch weekly schedule:', err.message);
            set({ isLoading: false, error: err.message }, undefined, 'schedule/fetchWeeklyError');
          });
        },

        getEntriesForDay: (day: string) => {
          const { schedule } = get();
          return schedule[day] ?? [];
        },

        getWeekDays: () => {
          const { selectedDay } = get();
          const start = getWeekStartStr(selectedDay);
          const [y, m, d] = start.split('-').map(Number);
          const startDate = new Date(y, m - 1, d);
          const days: string[] = [];
          for (let i = 0; i < 7; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            days.push(toLocalDate(date));
          }
          return days;
        },

        initListeners,
        cleanupListeners,
      };
    },
    { name: 'schedule' }
  )
);
