import { create } from 'zustand';
import { maybeDevtools } from '@/stores/utils/maybeDevtools';
import { getSocket, emitWithErrorHandling } from '@/lib/socket';
import {
  MalSyncEvents,
  createLogger,
  type SyncProgress,
  type SyncResult,
  type SyncAction,
  type SyncEntryDirection,
  type SyncEntryRequest,
  type SyncEntryResult,
} from '@shiroani/shared';

const logger = createLogger('MalSyncStore');

/**
 * The MAL twin of {@link useAniListSyncStore}. Sync runs main-side and can take
 * many minutes on a large list (MAL throttles writes), so the ack timeout is
 * generous — a slow-but-succeeding run must not be reported as "failed" while the
 * server is still working (which would also collide with the single-flight guard
 * on retry). True hangs are still bounded by the MAL client's per-request timeout
 * + retries, so the run always terminates.
 *
 * Crucially, the MAL store reads ONLY its own state: MAL and AniList have
 * INDEPENDENT single-flight guards main-side and can run concurrently, so this
 * store never cross-gates against AniList sync state.
 */
const SYNC_TIMEOUT_MS = 1_200_000; // 20 min

/** Generic i18n key surfaced when a MAL sync fails; resolved in the component. */
const SYNC_ERROR_KEY = 'accounts:mal.sync.error';

interface MalSyncState {
  syncing: boolean;
  /** Live per-entry progress during a run, or null when idle. */
  progress: SyncProgress | null;
  /** Final tally of the last completed run, or null. */
  result: SyncResult | null;
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

interface MalSyncActions {
  sync: () => Promise<void>;
  /**
   * Reconcile a SINGLE library entry against MAL in a forced direction
   * (`push`/`pull`) or `auto`. Resolves with the outcome action (or `'error'`
   * on failure) so the caller can surface a result toast — this thunk stays
   * i18n-agnostic, mirroring {@link sync}. The desktop gateway broadcasts
   * `LibraryEvents.UPDATED` on success, so the library store re-fetches and the
   * per-entry sync badge refreshes automatically (no manual refetch here).
   */
  syncEntry: (localId: number, direction: SyncEntryDirection) => Promise<SyncAction>;
}

type MalSyncStore = MalSyncState & MalSyncActions;

export const useMalSyncStore = create<MalSyncStore>()(
  maybeDevtools(
    (set, get) => ({
      syncing: false,
      progress: null,
      result: null,
      lastSyncedAt: null,
      error: null,
      entrySyncingId: null,

      sync: async () => {
        // Single-flight across BOTH MAL paths: refuse a full sync while a
        // per-entry MAL sync is in flight (the main process shares one `running`
        // guard FOR MAL). AniList sync state is intentionally ignored here.
        if (get().syncing || get().entrySyncingId !== null) return;

        set(
          { syncing: true, error: null, result: null, progress: null },
          undefined,
          'malSync/start'
        );

        // `getSocket()` throws if the socket singleton isn't initialized; keep it
        // (and the listener wiring) inside the try so any failure surfaces through
        // the catch instead of escaping as an unhandled rejection.
        let detach: (() => void) | null = null;
        try {
          const socket = getSocket();
          const handleProgress = (progress: SyncProgress) => {
            set({ progress }, undefined, 'malSync/progress');
          };
          socket.on(MalSyncEvents.PROGRESS, handleProgress);
          detach = () => socket.off(MalSyncEvents.PROGRESS, handleProgress);

          const result = await emitWithErrorHandling<undefined, SyncResult>(
            MalSyncEvents.SYNC,
            undefined,
            { timeout: SYNC_TIMEOUT_MS }
          );
          set(
            { result, lastSyncedAt: Date.now(), syncing: false, progress: null },
            undefined,
            'malSync/done'
          );
        } catch (error) {
          logger.error('MAL sync failed:', error);
          // `result` is already cleared at start, but reset it here too so the
          // error branch is self-evidently correct and survives future refactors —
          // a stale success summary must never render alongside an error.
          set(
            { error: SYNC_ERROR_KEY, syncing: false, progress: null, result: null },
            undefined,
            'malSync/error'
          );
        } finally {
          detach?.();
        }
      },

      syncEntry: async (localId, direction) => {
        const state = get();
        // Don't start a per-entry sync while a full MAL sync (or another per-entry
        // MAL sync) is in flight — the desktop service shares a single-flight
        // guard FOR MAL, so this just avoids a guaranteed-to-reject round trip.
        // AniList sync state is intentionally ignored.
        if (state.syncing || state.entrySyncingId !== null) return 'error';

        set({ entrySyncingId: localId }, undefined, 'malSync/entryStart');
        try {
          const result = await emitWithErrorHandling<SyncEntryRequest, SyncEntryResult>(
            MalSyncEvents.SYNC_ENTRY,
            { localId, direction }
          );
          return result.action;
        } catch (error) {
          logger.error('MAL entry sync failed:', error);
          return 'error';
        } finally {
          set({ entrySyncingId: null }, undefined, 'malSync/entryDone');
        }
      },
    }),
    { name: 'malSync' }
  )
);
