/**
 * Provider-agnostic contract for the two-way tracker sync engine.
 *
 * The {@link ProviderSyncEngine} owns ORCHESTRATION ONLY — single-flight, dedup
 * by provider id, the start-of-run snapshot, the optimistic re-read guard, the
 * import/push/reconcile loop skeleton, per-entry progress, and the final tally.
 * Everything provider-specific (auth, transport, the merge decision, enum/score
 * conversion, the baseline column to stamp) lives behind a
 * {@link SyncProviderAdapter}.
 *
 * WHY THE MERGE LIVES IN THE ADAPTER, NOT THE ENGINE. The shipped AniList
 * reconciler (`anilist-sync/reconcile.ts`) speaks AniList wire on BOTH ends — it
 * consumes an `AniListMediaListEntry` (UPPERCASE status enum, 0–100 score) and
 * emits a `SaveMediaListEntry` push (`scoreRaw` 0–100). Feeding it canonical-local
 * values would not typecheck, and canonicalizing it now would change the
 * positional `decideMerge(local, remote)` signature its tests pin. So the engine
 * carries the provider's normalized remote entry OPAQUELY (`RemoteEntry`) and
 * delegates the merge to the adapter, which calls its own reconciler internally.
 * This is the deliberate deviation noted in `packages/shared/tracker-provider.ts`
 * ("revise signatures when MAL applies pressure"): the engine is genuinely
 * provider-agnostic (no reconcile / AniList-type imports), so MAL plugs in by
 * supplying its own adapter without touching reconcile.
 */

import type { AniListSyncRow } from '../library/library.types';
import type { TrackerProviderId } from '@shiroani/shared';

/**
 * The local-row projection the engine reconciles. This is the existing
 * {@link AniListSyncRow} (kept under that name because `reconcile.ts` and its
 * tests import it) — but treated generically here: it carries BOTH providers'
 * id + baseline fields, and each adapter reads only its own.
 */
export type SyncLocalRow = AniListSyncRow;

/**
 * Minimal shape the ENGINE needs from a provider's remote entry: a media id to
 * match against the provider id column + dedup tiebreak, a title for the progress
 * label, and `updatedAt` for the dedup tiebreak. The adapter's full normalized
 * entry is carried opaquely as the generic `R` so the adapter can run its own
 * merge — the engine never inspects it beyond these three fields.
 */
export interface RemoteEntryCore {
  /**
   * Provider media id (AniList `mediaId` / MAL id). Named `mediaId` to match both
   * the shipped `AniListMediaListEntry` and the shared `TrackerListEntry.mediaId`
   * convention, so an adapter's normalized entry satisfies this with no rename.
   */
  mediaId: number;
  /** Display title for the per-entry progress label. */
  title: string;
  /** Provider entry `updatedAt`, epoch seconds. Used for the dedup tiebreak. */
  updatedAt: number;
}

/**
 * The library accessors the engine drives, narrowed to the read/write surface a
 * sync needs. The concrete `LibraryService` satisfies this for both providers
 * (the AniList path is wired to the `anilist_*` columns, the MAL path to the
 * `mal_*` columns via the adapter's `markSynced`).
 */
export interface SyncLibraryPort {
  /** Project every library row for reconciliation (start-of-run snapshot). */
  getEntriesForSync(): SyncLocalRow[];
  /** Project a single row for reconciliation (single-entry sync). */
  getSyncRowById(id: number): SyncLocalRow | undefined;
  /**
   * Re-read a row's current state for the optimistic-concurrency guard. Only
   * `{ id, updatedAt }` is consulted; the full entry shape is irrelevant here.
   */
  getEntryById(id: number): { id: number; updatedAt: string } | undefined;
}

/**
 * What one matched-entry reconcile did, reported back to the engine so it can
 * tally and label without knowing the provider's merge rules.
 */
export interface ReconcileOutcome {
  /** The local row was written (a pull happened). */
  localUpdated: boolean;
  /** The remote entry was written (a push happened). */
  remoteUpdated: boolean;
  /** Both sides had diverged since the baseline; resolved by latest-wins. */
  conflict: boolean;
}

/**
 * Per-entry result for a single-entry sync, mirroring the AniList action enum.
 */
export type SyncEntryAction = 'imported' | 'pushed' | 'updated' | 'unchanged' | 'skipped';

/**
 * The seam every provider supplies. The engine calls these in a fixed order; the
 * adapter performs the actual auth/network/db writes and (crucially) the merge.
 *
 * Optimistic-concurrency contract: the engine guarantees that before it calls
 * {@link reconcileMatch}, {@link pushLocalOnly}, or {@link applyPull}/{@link applyAuto}
 * it has confirmed (via {@link SyncLibraryPort.getEntryById}) the row is unchanged
 * since the snapshot. Adapters never need to re-check; they just perform writes.
 *
 * @typeParam R - the provider's opaque normalized remote-entry type.
 */
export interface SyncProviderAdapter<R extends RemoteEntryCore = RemoteEntryCore> {
  /** Which tracker this adapter speaks to — labels logs + the engine's provider id. */
  readonly providerId: TrackerProviderId;

  /** Resolve (and assert) the connected viewer id, or throw if not connected. */
  getViewerId(): Promise<number>;

  /**
   * The viewer's full remote list, normalized to the adapter's `R` shape. May
   * contain the same `id` more than once (AniList returns a media per list) — the
   * engine dedups by `id`, keeping the most recently `updatedAt` occurrence.
   */
  getRemoteEntries(viewerId: number): Promise<R[]>;

  /**
   * Fetch the single remote entry for `mediaId` (single-entry sync, read side),
   * or null when the viewer has no entry for it.
   */
  getRemoteEntry(mediaId: number, viewerId: number): Promise<R | null>;

  /** This row's provider media id (anilistId for AniList, malId for MAL), or null. */
  providerMediaId(local: SyncLocalRow): number | null;

  /**
   * Import a remote-only entry into the local library and stamp this provider's
   * baseline from the remote `updatedAt`. The engine guarantees no local match
   * exists. Performs the insert + `markSynced` internally.
   */
  importRemote(remote: R): Promise<void>;

  /**
   * Reconcile a matched local row against its remote entry: run the merge,
   * perform the conditional local and/or remote writes, then stamp this
   * provider's baseline from the final remote `updatedAt`. ALWAYS re-baselines —
   * even when nothing changed — so the next run sees a reconciled row.
   */
  reconcileMatch(local: SyncLocalRow, remote: R): Promise<ReconcileOutcome>;

  /**
   * Push a local-only entry to the remote (create/update) and stamp this
   * provider's baseline from the returned remote `updatedAt`. Caller guarantees
   * {@link providerMediaId} is non-null.
   */
  pushLocalOnly(local: SyncLocalRow): Promise<void>;

  /**
   * Forced pull (single-entry sync): overwrite the local row from the remote
   * entry (remote wins, no merge) and re-baseline. Returns 'updated' when a write
   * happened, 'unchanged' when the local row already matched (baseline still
   * refreshed).
   */
  applyPull(local: SyncLocalRow, remote: R): SyncEntryAction;

  /**
   * Forced/auto merge for one matched entry (single-entry sync, 'auto'
   * direction): one iteration of {@link reconcileMatch}'s logic, returning
   * 'updated' or 'unchanged'.
   */
  applyAuto(local: SyncLocalRow, remote: R): Promise<SyncEntryAction>;
}
