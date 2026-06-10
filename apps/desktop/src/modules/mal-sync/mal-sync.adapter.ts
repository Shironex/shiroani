/**
 * MyAnimeList implementation of the provider-agnostic {@link SyncProviderAdapter}.
 *
 * The MAL twin of `anilist-sync/anilist-sync.adapter.ts`: it is the ONLY place
 * that knows MAL's wire format during a sync. It owns the MAL merge
 * (`mal-reconcile.ts`, NOT the AniList reconciler — that one is AniList-wire
 * coupled), the {@link MalClient} REST calls, the `mal_*` baseline column
 * (`markMalSync`), and the title→`mal_id` search backfill. The
 * {@link ProviderSyncEngine} drives it without importing any of this.
 *
 * Normalized remote shape: {@link MalSyncRemoteEntry} extends the Wave-6
 * {@link MalListEntry} with a non-null `updatedAt` (epoch seconds, 0-floored) so
 * it satisfies the engine's `RemoteEntryCore` (which requires `title: string`
 * and `updatedAt: number` — `MalListEntry.updatedAt` is `number | null`).
 */

import { createLogger, extractErrorMessage, normalizeAnimeTitle } from '@shiroani/shared';
import type { LibraryService } from '../library';
import type { AniListSyncRow } from '../library/library.types';
import type { MalClient, MalListEntry } from '../anime/mal-client';
import type {
  ReconcileOutcome,
  RemoteEntryCore,
  SyncEntryAction,
  SyncLocalRow,
  SyncProviderAdapter,
} from '../sync/sync-engine.types';
import {
  buildMalAddPayload,
  buildMalPullUpdate,
  buildMalPushInput,
  decideMalMerge,
} from './mal-reconcile';

const logger = createLogger('MalSyncAdapter');

/**
 * The MAL entry normalized for the engine: a {@link MalListEntry} with a
 * guaranteed non-null `updatedAt` (engine uses it for the dedup tiebreak, where
 * `null > number` would always be false). Satisfies {@link RemoteEntryCore}.
 */
export interface MalSyncRemoteEntry extends MalListEntry, RemoteEntryCore {
  updatedAt: number;
}

/** Coerce a Wave-6 {@link MalListEntry} into the engine-safe normalized shape. */
function normalize(entry: MalListEntry): MalSyncRemoteEntry {
  return { ...entry, updatedAt: entry.updatedAt ?? 0 };
}

/** Narrow the generic row back to its concrete projection. */
function asRow(local: SyncLocalRow): AniListSyncRow {
  return local;
}

export class MalSyncProviderAdapter implements SyncProviderAdapter<MalSyncRemoteEntry> {
  readonly providerId = 'mal' as const;

  constructor(
    private readonly client: MalClient,
    private readonly library: LibraryService
  ) {}

  async getViewerId(): Promise<number> {
    const viewer = await this.client.getViewer();
    if (!viewer) {
      throw new Error('MAL account is not connected');
    }
    return viewer.id;
  }

  async getRemoteEntries(): Promise<MalSyncRemoteEntry[]> {
    const entries = await this.client.getAnimeList();
    return entries.map(normalize);
  }

  async getRemoteEntry(mediaId: number): Promise<MalSyncRemoteEntry | null> {
    const entry = await this.client.getAnimeListEntry(mediaId);
    return entry ? normalize(entry) : null;
  }

  providerMediaId(local: SyncLocalRow): number | null {
    return asRow(local).malId ?? null;
  }

  async importRemote(remote: MalSyncRemoteEntry): Promise<void> {
    const created = this.library.addEntry(buildMalAddPayload(remote));
    this.library.markMalSync(created.id, remote.updatedAt);
  }

  async reconcileMatch(local: SyncLocalRow, remote: MalSyncRemoteEntry): Promise<ReconcileOutcome> {
    const row = asRow(local);
    const decision = decideMalMerge(row, remote);
    let finalRemoteUpdatedAt = remote.updatedAt;

    if (decision.localUpdate) {
      this.library.updateEntry(row.id, decision.localUpdate);
    }
    if (decision.remotePush) {
      const result = await this.client.updateListStatus({
        malId: remote.mediaId,
        ...decision.remotePush,
      });
      finalRemoteUpdatedAt = result.updatedAt ?? finalRemoteUpdatedAt;
    }

    // Always refresh the baseline — even for an unchanged entry — so the next run
    // sees this row as reconciled (no false "changed" on either side).
    this.library.markMalSync(row.id, finalRemoteUpdatedAt);

    return {
      localUpdated: decision.localUpdate != null,
      remoteUpdated: decision.remotePush != null,
      conflict: decision.conflict,
    };
  }

  async pushLocalOnly(local: SyncLocalRow): Promise<void> {
    const row = asRow(local);
    const result = await this.client.updateListStatus(buildMalPushInput(row));
    // MAL returns the post-write updatedAt; 0-floor a missing timestamp so the
    // baseline is always a real number.
    this.library.markMalSync(row.id, result.updatedAt ?? 0);
  }

  applyPull(local: SyncLocalRow, remote: MalSyncRemoteEntry): SyncEntryAction {
    const row = asRow(local);
    const update = buildMalPullUpdate(row, remote);
    if (update) {
      this.library.updateEntry(row.id, update);
      this.library.markMalSync(row.id, remote.updatedAt);
      return 'updated';
    }
    // Already matching the remote — just refresh the baseline.
    this.library.markMalSync(row.id, remote.updatedAt);
    return 'unchanged';
  }

  async applyAuto(local: SyncLocalRow, remote: MalSyncRemoteEntry): Promise<SyncEntryAction> {
    const outcome = await this.reconcileMatch(local, remote);
    return outcome.localUpdated || outcome.remoteUpdated ? 'updated' : 'unchanged';
  }

  // ============================================
  // mal_id backfill (MAL-specific — NOT part of the engine contract)
  // ============================================

  /**
   * Best-effort backfill of `mal_id` for LOCAL-ONLY rows (no `anilistId`) that have
   * a title but no MAL id, so the engine (whose `providerMediaId` is synchronous)
   * can subsequently match/push them. Runs as a PRE-PASS before
   * {@link ProviderSyncEngine.runFullSync} because the engine never reaches
   * `pushLocalOnly` for a null-id row — it tallies it `skippedNoId` first. After
   * this pass, a still-unresolved row remains `skippedNoId` (mirrors AniList), and
   * a resolved row flows through normally.
   *
   * AniList-linked rows are SKIPPED here on purpose: the AniList sync populates
   * their `mal_id` from AniList's exact `idMal` cross-ref (see
   * `anilist-sync.adapter.ts`). A row that has an `anilistId` but still no `mal_id`
   * means AniList reports no MAL mapping for it — there is no MAL equivalent to
   * find, so a title search would only risk mis-linking. (Run an AniList sync once
   * to populate these before the first MAL sync.) Title search is therefore the
   * fallback for genuinely local-only rows (e.g. browser-detected additions) only.
   *
   * Resolution rule for those rows: `searchAnime(title)` and accept a CONFIDENT
   * match ONLY — exactly one hit whose normalized title EQUALS the local title.
   * Any ambiguity → skip+log (no write).
   *
   * UNIQUE-collision safety: `mal_id` is UNIQUE (migration v14) but resolved from
   * a non-unique source, so two local rows CAN resolve to the same id. A UNIQUE
   * violation on write is caught, logged, and SKIPPED — the run CONTINUES; a
   * single duplicate never aborts the backfill (the AniList dedup-by-id shape).
   */
  async backfillMalIds(): Promise<void> {
    const rows = this.library.getEntriesForSync();
    for (const row of rows) {
      if (row.malId != null || row.anilistId != null || !row.title?.trim()) continue;
      try {
        const malId = await this.resolveMalId(row.title);
        if (malId == null) continue; // ambiguous / no hit → leave unresolved
        this.library.setMalId(row.id, malId);
      } catch (error) {
        const message = extractErrorMessage(error);
        // A UNIQUE collision (another row already links this MAL id) is expected
        // given the non-unique source — skip+log this one row and CONTINUE.
        if (/unique/i.test(message)) {
          logger.warn(
            `[mal] skip backfill for "${row.title}" (id=${row.id}): mal_id already linked (${message})`
          );
          continue;
        }
        // Any other failure (e.g. a transient search error) is per-row isolated
        // too — never abort the whole backfill.
        logger.warn(`[mal] backfill failed for "${row.title}" (id=${row.id}): ${message}`);
      }
    }
  }

  /**
   * Backfill a SINGLE row's `mal_id` by title (single-entry push/auto pre-pass).
   * Same scope + rules as {@link backfillMalIds}: AniList-linked rows are skipped
   * (their `mal_id` comes from AniList's `idMal`), title search is the fallback for
   * local-only rows, and errors are isolated so a per-entry sync never throws from
   * the backfill step.
   */
  async backfillMalIdForRow(row: AniListSyncRow): Promise<void> {
    if (row.malId != null || row.anilistId != null || !row.title?.trim()) return;
    try {
      const malId = await this.resolveMalId(row.title);
      if (malId == null) return;
      this.library.setMalId(row.id, malId);
    } catch (error) {
      const message = extractErrorMessage(error);
      if (/unique/i.test(message)) {
        logger.warn(
          `[mal] skip backfill for "${row.title}" (id=${row.id}): mal_id already linked (${message})`
        );
        return;
      }
      logger.warn(`[mal] backfill failed for "${row.title}" (id=${row.id}): ${message}`);
    }
  }

  /**
   * Resolve a confident MAL id for a title via search, or null on ambiguity.
   * Confident = EXACTLY ONE hit whose normalized title equals the query's
   * normalized title. MAL search is fuzzy, so a lone hit is NOT trusted on its
   * own (it may be a near-miss); anything without a unique exact-title match
   * returns null (skip+log upstream) rather than risk linking a wrong mal_id.
   */
  private async resolveMalId(title: string): Promise<number | null> {
    const wanted = normalizeTitle(title);
    // Session-scoped negative cache: a title that resolved to no confident
    // match will resolve the same way on every later sync this session, and
    // re-searching it added one remote roundtrip per permanently-ambiguous row
    // to EVERY run. Transient search errors throw and never reach the cache.
    if (this.unresolvableTitles.has(wanted)) return null;

    const hits = await this.client.searchAnime(title);
    if (hits.length === 0) {
      this.unresolvableTitles.add(wanted);
      return null;
    }

    const exact = hits.filter(h => normalizeTitle(h.title) === wanted);
    if (exact.length === 1) return exact[0].id;

    // No single exact-title match (fuzzy-only single hit, or multiple exacts) →
    // too ambiguous to trust; skip the backfill rather than mis-link.
    logger.warn(`[mal] ambiguous search for "${title}" (${hits.length} hits) — skipping backfill`);
    this.unresolvableTitles.add(wanted);
    return null;
  }

  /** See {@link resolveMalId} — keyed by normalized title so an edit re-searches. */
  private readonly unresolvableTitles = new Set<string>();
}

/**
 * Case/space/punctuation/diacritic-insensitive title key for the
 * confident-match test — the shared rule both processes use (the previous
 * local version kept combining marks, so "Pokémon" failed to match "Pokemon").
 */
const normalizeTitle = normalizeAnimeTitle;
