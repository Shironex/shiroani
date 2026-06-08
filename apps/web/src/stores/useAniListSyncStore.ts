import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
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
  type FullSyncDirection,
  type FullSyncPushMode,
  type FullSyncRequest,
} from '@shiroani/shared';

const logger = createLogger('AniListSyncStore');

/**
 * Build the full-sync request for the persisted direction mode. Push-only mode
 * mirrors the local library onto AniList on every run, so it OVERWRITES existing
 * remote entries (local is the source of truth) — the one-shot push button uses
 * {@link AniListSyncActions.pushLibrary} to choose create-missing vs overwrite
 * explicitly instead.
 */
function requestForMode(mode: FullSyncDirection): FullSyncRequest {
  // `mode` is rehydrated from localStorage, so a stale/corrupted value could
  // reach here — default anything unrecognised to two-way rather than emit an
  // invalid `direction` the gateway schema would reject.
  if (mode === 'push') return { direction: 'push', pushMode: 'overwrite' };
  if (mode === 'pull') return { direction: 'pull' };
  return { direction: 'two-way' };
}

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
  /**
   * Persisted direction the manual "Sync now" button (and any recurring run) uses:
   * `two-way` (reconcile), `push` (local → AniList, overwrite) or `pull`
   * (AniList → local). The ONLY persisted field on this store — transient run
   * state (`syncing`/`progress`/`result`/…) is deliberately not persisted.
   */
  directionMode: FullSyncDirection;
}

interface AniListSyncActions {
  /**
   * Run a full-library sync. With no argument it uses the persisted
   * {@link AniListSyncState.directionMode}; an explicit `override` (used by
   * {@link pushLibrary}) wins. Single-flight across both the full and per-entry
   * paths — a no-op if a sync is already running.
   */
  sync: (override?: FullSyncRequest) => Promise<void>;
  /**
   * One-shot push of the ENTIRE local library to AniList. `create-missing` only
   * creates entries AniList doesn't have; `overwrite` also rewrites existing ones
   * (local wins). Never pulls. Delegates to {@link sync} so it shares the same
   * single-flight guard, progress, and result wiring.
   */
  pushLibrary: (pushMode: FullSyncPushMode) => Promise<void>;
  /** Set (and persist) the direction mode the "Sync now" button uses. */
  setDirectionMode: (mode: FullSyncDirection) => void;
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
  persist(
    maybeDevtools(
      (set, get) => ({
        syncing: false,
        progress: null,
        result: null,
        lastSyncedAt: null,
        error: null,
        entrySyncingId: null,
        directionMode: 'two-way',

        sync: async override => {
          // Single-flight across BOTH paths: refuse a full sync while a per-entry
          // sync is in flight (the main process shares one `running` guard).
          if (get().syncing || get().entrySyncingId !== null) return;

          // Explicit override (from pushLibrary) wins; otherwise derive from the
          // persisted direction mode.
          const payload = override ?? requestForMode(get().directionMode);

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

            const result = await emitWithErrorHandling<FullSyncRequest, AniListSyncResult>(
              AniListSyncEvents.SYNC,
              payload,
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

        pushLibrary: async pushMode => {
          await get().sync({ direction: 'push', pushMode });
        },

        setDirectionMode: mode => {
          set({ directionMode: mode }, undefined, 'anilistSync/setDirectionMode');
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
    ),
    {
      name: 'anilist-sync-prefs',
      storage: createJSONStorage(() => localStorage),
      // Only the chosen direction mode survives reloads; transient run state
      // (syncing/progress/result/error/lastSyncedAt/entrySyncingId) is NEVER
      // persisted — a stale `syncing: true` would render the card stuck.
      partialize: state => ({ directionMode: state.directionMode }),
    }
  )
);
