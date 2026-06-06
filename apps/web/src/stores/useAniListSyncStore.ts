import { create } from 'zustand';
import { maybeDevtools } from '@/stores/utils/maybeDevtools';
import { getSocket, emitWithErrorHandling } from '@/lib/socket';
import {
  AniListSyncEvents,
  createLogger,
  type AniListSyncProgress,
  type AniListSyncResult,
  type AniListSyncAction,
  type AniListSyncEntryDirection,
  type AniListSyncEntryRequest,
  type AniListSyncEntryResult,
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
  /**
   * Local id of the single entry currently being reconciled via {@link syncEntry},
   * or null when no per-entry sync is in flight. Kept separate from the global
   * `syncing` flag so a manual push/pull from the library detail modal does NOT
   * make the Accounts full-sync card render misleading progress.
   */
  entrySyncingId: number | null;
}

interface AniListSyncActions {
  sync: () => Promise<void>;
  /**
   * Reconcile a SINGLE library entry against AniList in a forced direction
   * (`push`/`pull`) or `auto`. Resolves with the outcome action (or `'error'`
   * on failure) so the caller can surface a result toast — this thunk stays
   * i18n-agnostic, mirroring {@link sync}. The desktop gateway broadcasts
   * `LibraryEvents.UPDATED` on success, so the library store re-fetches and the
   * per-entry sync badge refreshes automatically (no manual refetch here).
   */
  syncEntry: (localId: number, direction: AniListSyncEntryDirection) => Promise<AniListSyncAction>;
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
      entrySyncingId: null,

      sync: async () => {
        // Single-flight across BOTH paths: refuse a full sync while a per-entry
        // sync is in flight (the main process shares one `running` guard).
        if (get().syncing || get().entrySyncingId !== null) return;

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

      syncEntry: async (localId, direction) => {
        const state = get();
        // Don't start a per-entry sync while a full sync (or another per-entry
        // sync) is in flight — the desktop service shares a single-flight guard,
        // so this just avoids a guaranteed-to-reject round trip.
        if (state.syncing || state.entrySyncingId !== null) return 'error';

        set({ entrySyncingId: localId }, undefined, 'anilistSync/entryStart');
        try {
          const result = await emitWithErrorHandling<
            AniListSyncEntryRequest,
            AniListSyncEntryResult
          >(AniListSyncEvents.SYNC_ENTRY, { localId, direction });
          return result.action;
        } catch (error) {
          logger.error('AniList entry sync failed:', error);
          return 'error';
        } finally {
          set({ entrySyncingId: null }, undefined, 'anilistSync/entryDone');
        }
      },
    }),
    { name: 'anilistSync' }
  )
);
