import { create } from 'zustand';
import { maybeDevtools } from '@/stores/utils/maybeDevtools';
import { getSocket, emitWithErrorHandling } from '@/lib/socket';
import {
  AniListSyncEvents,
  createLogger,
  type AniListSyncProgress,
  type AniListSyncResult,
} from '@shiroani/shared';

const logger = createLogger('AniListSyncStore');

/**
 * Sync runs main-side and can take many minutes on a large list: AniList throttles
 * writes (~30/min), so a push-heavy first sync of hundreds of entries legitimately
 * runs long. The ack timeout is generous so a slow-but-succeeding run isn't
 * reported as "failed" while the server is still working (which would also collide
 * with the single-flight guard on retry). True hangs are still bounded by the
 * AniListClient's per-request timeout + retries, so the run always terminates.
 */
const SYNC_TIMEOUT_MS = 1_200_000; // 20 min

/** Generic i18n key surfaced when a sync fails; resolved in the component. */
const SYNC_ERROR_KEY = 'accounts:anilist.sync.error';

interface AniListSyncState {
  syncing: boolean;
  /** Live per-entry progress during a run, or null when idle. */
  progress: AniListSyncProgress | null;
  /** Final tally of the last completed run, or null. */
  result: AniListSyncResult | null;
  /** Epoch ms of the last successful sync (in-session), or null. */
  lastSyncedAt: number | null;
  /** Full `namespace:key` i18n reference for the last error, or null. */
  error: string | null;
}

interface AniListSyncActions {
  sync: () => Promise<void>;
}

type AniListSyncStore = AniListSyncState & AniListSyncActions;

export const useAniListSyncStore = create<AniListSyncStore>()(
  maybeDevtools(
    (set, get) => ({
      syncing: false,
      progress: null,
      result: null,
      lastSyncedAt: null,
      error: null,

      sync: async () => {
        if (get().syncing) return;

        set(
          { syncing: true, error: null, result: null, progress: null },
          undefined,
          'anilistSync/start'
        );

        // `getSocket()` throws if the socket singleton isn't initialized; keep it
        // (and the listener wiring) inside the try so any failure surfaces through
        // the catch instead of escaping as an unhandled rejection.
        let detach: (() => void) | null = null;
        try {
          const socket = getSocket();
          const handleProgress = (progress: AniListSyncProgress) => {
            set({ progress }, undefined, 'anilistSync/progress');
          };
          socket.on(AniListSyncEvents.PROGRESS, handleProgress);
          detach = () => socket.off(AniListSyncEvents.PROGRESS, handleProgress);

          const result = await emitWithErrorHandling<undefined, AniListSyncResult>(
            AniListSyncEvents.SYNC,
            undefined,
            { timeout: SYNC_TIMEOUT_MS }
          );
          set(
            { result, lastSyncedAt: Date.now(), syncing: false, progress: null },
            undefined,
            'anilistSync/done'
          );
        } catch (error) {
          logger.error('AniList sync failed:', error);
          // `result` is already cleared at start, but reset it here too so the
          // error branch is self-evidently correct and survives future refactors —
          // a stale success summary must never render alongside an error.
          set(
            { error: SYNC_ERROR_KEY, syncing: false, progress: null, result: null },
            undefined,
            'anilistSync/error'
          );
        } finally {
          detach?.();
        }
      },
    }),
    { name: 'anilistSync' }
  )
);
