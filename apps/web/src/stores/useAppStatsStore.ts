import { create } from 'zustand';
import { maybeDevtools } from '@/stores/utils/maybeDevtools';
import type { AppStatsSnapshot } from '@shiroani/shared';
import { IS_ELECTRON } from '@/lib/platform';

const POLL_INTERVAL_MS = 60_000;

const EMPTY_SNAPSHOT: AppStatsSnapshot = {
  version: 1,
  createdAt: null,
  totals: {
    appOpenSeconds: 0,
    appActiveSeconds: 0,
    animeWatchSeconds: 0,
    sessionCount: 0,
  },
  byDay: {},
  currentStreak: { days: 0, lastDay: null },
  longestStreak: { days: 0, lastDay: null },
};

interface AppStatsState {
  snapshot: AppStatsSnapshot;
  isLoading: boolean;
  lastFetchedAt: number | null;
}

interface AppStatsActions {
  refresh: () => Promise<void>;
  reset: () => Promise<void>;
}

type AppStatsStore = AppStatsState & AppStatsActions;

export const useAppStatsStore = create<AppStatsStore>()(
  maybeDevtools(
    (set, get) => ({
      snapshot: EMPTY_SNAPSHOT,
      isLoading: false,
      lastFetchedAt: null,

      refresh: async () => {
        if (!IS_ELECTRON || !window.electronAPI?.appStats) return;
        if (get().isLoading) return;
        set({ isLoading: true }, undefined, 'app-stats/fetching');
        try {
          const snapshot = await window.electronAPI.appStats.getSnapshot();
          set(
            { snapshot, isLoading: false, lastFetchedAt: Date.now() },
            undefined,
            'app-stats/loaded'
          );
        } catch (err) {
          console.error('[app-stats] refresh failed', err);
          set({ isLoading: false }, undefined, 'app-stats/error');
        }
      },

      reset: async () => {
        if (!IS_ELECTRON || !window.electronAPI?.appStats) return;
        try {
          const snapshot = await window.electronAPI.appStats.reset();
          set(
            { snapshot, isLoading: false, lastFetchedAt: Date.now() },
            undefined,
            'app-stats/reset'
          );
        } catch (err) {
          console.error('[app-stats] reset failed', err);
          set({ isLoading: false }, undefined, 'app-stats/error');
        }
      },
    }),
    { name: 'app-stats' }
  )
);

let pollTimer: ReturnType<typeof setInterval> | null = null;
let pollSubscribers = 0;

/**
 * Start the 60s polling loop. Subscriber-counted so concurrent consumers
 * (sidebar, in-app stats panel) don't tear down each other's polling on
 * unmount — the timer only stops when the last subscriber leaves.
 */
export function startAppStatsPolling(): void {
  pollSubscribers += 1;
  if (pollTimer) return;
  void useAppStatsStore.getState().refresh();
  pollTimer = setInterval(() => {
    void useAppStatsStore.getState().refresh();
  }, POLL_INTERVAL_MS);
}

export function stopAppStatsPolling(): void {
  pollSubscribers = Math.max(0, pollSubscribers - 1);
  if (pollSubscribers === 0 && pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}
