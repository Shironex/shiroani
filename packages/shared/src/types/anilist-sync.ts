/**
 * Two-way AniList sync contract shared between the desktop main process (the
 * sync gateway) and the web renderer (the sync store + settings UI).
 *
 * Only progress + result summaries cross this boundary — the AniList access
 * token and the raw MediaList entries stay in the main process. Reconciliation
 * (status/score mapping, conflict resolution) is performed main-side.
 */

/**
 * What happened to a single library entry during a sync pass. Drives the
 * per-entry progress label and the final tallies.
 *
 * - `imported`  — a remote AniList entry was created in the local library
 * - `pushed`    — a local-only entry (with a resolvable AniList id) was created on AniList
 * - `updated`   — an existing match diverged and was reconciled (local and/or remote written)
 * - `unchanged` — an existing match was already in sync
 * - `skipped`   — a local entry without an AniList id (can't resolve a mediaId)
 * - `error`     — the entry failed to sync (e.g. a write rejected)
 */
export type AniListSyncAction =
  | 'imported'
  | 'pushed'
  | 'updated'
  | 'unchanged'
  | 'skipped'
  | 'error';

/** Incremental progress emitted once per processed entry during a run. */
export interface AniListSyncProgress {
  /** 1-based index of the entry just processed. */
  current: number;
  /** Total entries the run will process (local ∪ remote, by AniList id). */
  total: number;
  /** Display title of the entry just processed. */
  title: string;
  /** Outcome for this entry. */
  action: AniListSyncAction;
}

/**
 * Forced direction for a single-entry sync.
 *
 * - `push` — overwrite the AniList entry from the local row (local wins)
 * - `pull` — overwrite the local row from the AniList entry (remote wins)
 * - `auto` — run the same merge decision a full sync would (latest-wins,
 *   present-wins, monotonic progress)
 */
export type AniListSyncEntryDirection = 'push' | 'pull' | 'auto';

/** Request payload for {@link AniListSyncEvents.SYNC_ENTRY}. */
export interface AniListSyncEntryRequest {
  /** Local library row id to reconcile. */
  localId: number;
  /** Which way to reconcile. */
  direction: AniListSyncEntryDirection;
}

/** Ack returned for a single-entry sync — the outcome for that one entry. */
export interface AniListSyncEntryResult {
  action: AniListSyncAction;
}

// ============================================
// Provider-neutral aliases (MAL sync reuses these shapes verbatim)
// ============================================
//
// The two-way sync contract is provider-agnostic: the MAL sync emits the SAME
// progress/result/action shapes as AniList (the desktop ProviderSyncEngine is
// parameterized over a provider adapter, not over a wire format). Rather than
// duplicate the interfaces, the MAL surface (events, gateway, store) references
// these aliases so a future neutral rename is a one-line change here.

/** Per-entry outcome for a sync pass — provider-neutral alias of {@link AniListSyncAction}. */
export type SyncAction = AniListSyncAction;
/** Incremental sync progress — provider-neutral alias of {@link AniListSyncProgress}. */
export type SyncProgress = AniListSyncProgress;
/** Forced single-entry sync direction — provider-neutral alias of {@link AniListSyncEntryDirection}. */
export type SyncEntryDirection = AniListSyncEntryDirection;
/** Single-entry sync request — provider-neutral alias of {@link AniListSyncEntryRequest}. */
export type SyncEntryRequest = AniListSyncEntryRequest;
/** Single-entry sync ack — provider-neutral alias of {@link AniListSyncEntryResult}. */
export type SyncEntryResult = AniListSyncEntryResult;

/** Final tally returned as the `SYNC` ack once a run completes. */
export interface AniListSyncResult {
  /** Remote entries created in the local library. */
  imported: number;
  /** Local-only entries created on AniList. */
  pushedNew: number;
  /** Existing matches whose local row was updated (pulled changes). */
  updatedLocal: number;
  /** Existing matches whose AniList entry was updated (pushed changes). */
  updatedRemote: number;
  /** Existing matches already in sync. */
  unchanged: number;
  /** Both sides had diverged since the last sync; resolved by latest-wins. */
  conflicts: number;
  /** Local entries skipped because they have no AniList id. */
  skippedNoId: number;
  /** Entries that failed to sync. */
  errors: number;
}

/** Final sync tally — provider-neutral alias of {@link AniListSyncResult}. */
export type SyncResult = AniListSyncResult;

// ============================================
// Full-library sync direction (provider-neutral)
// ============================================
//
// The full sync ({@link AniListSyncEvents.SYNC} / {@link MalSyncEvents.SYNC}) was
// originally two-way only. These types let the renderer pick a direction per run
// — distinct from the per-entry {@link SyncEntryDirection}, which forces ONE row.

/**
 * Direction for a FULL-LIBRARY sync run.
 *
 * - `two-way` — the original reconcile: import remote-only, push local-only, merge matches.
 * - `push`    — local → remote only. Never pulls or modifies the local library.
 * - `pull`    — remote → local only. Never writes to the remote account.
 */
export type FullSyncDirection = 'two-way' | 'push' | 'pull';

/**
 * For a `push` run, which local entries to write.
 *
 * - `create-missing` — push only entries the remote doesn't have yet; leave existing remote entries untouched.
 * - `overwrite`      — push every local entry, overwriting the remote copy where it already exists (local wins).
 */
export type FullSyncPushMode = 'create-missing' | 'overwrite';

/**
 * Request payload for a full-library sync. Rides in the (previously empty) `SYNC`
 * event. A missing/undefined payload is treated as `{ direction: 'two-way' }` so
 * the original behaviour is preserved.
 *
 * Modelled as a discriminated union so `pushMode` is REQUIRED for `direction:
 * 'push'` and ignored otherwise — this keeps the compile-time type in lockstep
 * with {@link fullSyncPayloadSchema}'s runtime contract (which rejects a push
 * payload missing `pushMode`).
 */
export type FullSyncRequest =
  | { direction: 'push'; pushMode: FullSyncPushMode }
  | { direction: 'two-way' | 'pull'; pushMode?: FullSyncPushMode };
