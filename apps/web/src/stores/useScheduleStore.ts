import { create } from 'zustand';
import { maybeDevtools } from '@/stores/utils/maybeDevtools';
import {
  type BackendStoreSlice,
  initialBackendState,
  createBackendActions,
  createBackendListeners,
} from '@/stores/utils/createBackendStore';
import {
  type AiringAnime,
  ScheduleEvents,
  toLocalDate,
  getWeekStart,
  createLogger,
} from '@shiroani/shared';
import { invokeBackend } from '@/lib/backend';
import { createLocalStorageAccessor } from '@/lib/persisted-storage';

const logger = createLogger('ScheduleStore');

/**
 * Sort order for schedule entries within a day.
 * - `time`: chronological by airing time (default).
 * - `tracked`: library + subscribed entries bubble to the top, then by time.
 */
export type ScheduleSort = 'time' | 'tracked';

/** Subset of schedule state that survives reloads. */
interface SchedulePrefs {
  onlyInLibrary: boolean;
  sort: ScheduleSort;
}

const PREFS_STORAGE_KEY = 'shiroani:schedulePrefs';

const DEFAULT_PREFS: SchedulePrefs = { onlyInLibrary: false, sort: 'time' };

// Persisted via localStorage (synchronous, web + electron) so the whole
// preference lives inside this store — no electron-store allowlist entry or
// app-init wiring needed. In-memory state stays authoritative; reads silently
// fall back to defaults.
const prefsStorage = createLocalStorageAccessor<SchedulePrefs>(PREFS_STORAGE_KEY, {
  parse: raw => {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return DEFAULT_PREFS;
    const obj = parsed as Record<string, unknown>;
    return {
      onlyInLibrary: typeof obj.onlyInLibrary === 'boolean' ? obj.onlyInLibrary : false,
      sort: obj.sort === 'tracked' ? 'tracked' : 'time',
    };
  },
  serialize: prefs => JSON.stringify(prefs),
  fallback: DEFAULT_PREFS,
});

/**
 * Schedule store state
 */
interface ScheduleState extends BackendStoreSlice {
  /** Airing schedule grouped by ISO date string */
  schedule: Record<string, AiringAnime[]>;
  /** Currently selected day (ISO date string YYYY-MM-DD) */
  selectedDay: string;
  /** View mode: daily, weekly list, or timetable grid */
  viewMode: 'daily' | 'weekly' | 'timetable';
  /** Filter to show only anime the user tracks (library or subscribed) */
  onlyInLibrary: boolean;
  /** Sort order for entries within a day */
  sort: ScheduleSort;
}

/**
 * Schedule store actions
 */
interface ScheduleActions {
  selectDay: (day: string) => void;
  setViewMode: (mode: 'daily' | 'weekly' | 'timetable') => void;
  toggleLibraryFilter: () => void;
  setSort: (sort: ScheduleSort) => void;
  /** First load at startup, and again after the system resumes. */
  loadInitialData: () => void;
  fetchDaily: (date: string) => void;
  fetchWeekly: (startDate: string) => void;
  getEntriesForDay: (day: string) => AiringAnime[];
  getWeekDays: () => string[];
  initListeners: () => void;
  cleanupListeners: () => void;
}

type ScheduleStore = ScheduleState & ScheduleActions;

/**
 * The response is the only delivery path, so a timeout loses the data. One AniList
 * request can take about 74 s with retries and backoff.
 */
const SCHEDULE_TIMEOUT_MS = 90_000;

function getWeekStartStr(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  return toLocalDate(getWeekStart(new Date(year, month - 1, day)));
}

export const useScheduleStore = create<ScheduleStore>()(
  maybeDevtools(
    (set, get) => {
      const backendActions = createBackendActions<ScheduleStore>(set, 'schedule');

      const { initListeners, cleanupListeners } = createBackendListeners<ScheduleStore>(
        get,
        set,
        'schedule',
        {
          listeners: [],
        }
      );

      // Seed persisted prefs synchronously at store creation so the toggle /
      // sort reflect the user's last choice on first paint.
      const initialPrefs = prefsStorage.get();

      return {
        // State
        ...initialBackendState,
        schedule: {},
        selectedDay: toLocalDate(new Date()),
        viewMode: 'daily',
        onlyInLibrary: initialPrefs.onlyInLibrary,
        sort: initialPrefs.sort,

        // Backend actions
        ...backendActions,

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
          const onlyInLibrary = !get().onlyInLibrary;
          set({ onlyInLibrary }, undefined, 'schedule/toggleLibraryFilter');
          prefsStorage.set({ onlyInLibrary, sort: get().sort });
        },

        setSort: (sort: ScheduleSort) => {
          set({ sort }, undefined, 'schedule/setSort');
          prefsStorage.set({ onlyInLibrary: get().onlyInLibrary, sort });
        },

        loadInitialData: () => {
          const { selectedDay, viewMode } = get();
          if (viewMode === 'daily') {
            get().fetchDaily(selectedDay);
          } else {
            // Both 'weekly' and 'timetable' use weekly data
            get().fetchWeekly(getWeekStartStr(selectedDay));
          }
        },

        fetchDaily: (date: string) => {
          set({ isLoading: true }, undefined, 'schedule/fetchingDaily');
          invokeBackend<{ date: string }, { date: string; entries: AiringAnime[] }>(
            ScheduleEvents.GET_DAILY,
            { date },
            { timeout: SCHEDULE_TIMEOUT_MS }
          )
            .then(result => {
              set(
                state => ({
                  schedule: { ...state.schedule, [result.date]: result.entries },
                  isLoading: false,
                  error: null,
                }),
                undefined,
                'schedule/dailyResult'
              );
            })
            .catch((err: Error) => {
              logger.error('Failed to fetch daily schedule:', err.message);
              set({ isLoading: false, error: err.message }, undefined, 'schedule/fetchDailyError');
            });
        },

        fetchWeekly: (startDate: string) => {
          set({ isLoading: true }, undefined, 'schedule/fetchingWeekly');
          invokeBackend<{ startDate: string }, { schedule: Record<string, AiringAnime[]> }>(
            ScheduleEvents.GET_WEEKLY,
            { startDate },
            { timeout: SCHEDULE_TIMEOUT_MS }
          )
            .then(result => {
              set(
                state => ({
                  schedule: { ...state.schedule, ...result.schedule },
                  isLoading: false,
                  error: null,
                }),
                undefined,
                'schedule/weeklyResult'
              );
            })
            .catch((err: Error) => {
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
