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
