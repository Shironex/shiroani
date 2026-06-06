/**
 * AniList implementation of the provider-agnostic {@link SyncProviderAdapter}.
 *
 * This is the ONLY place that knows AniList's wire format during a sync: it owns
 * the (unchanged) `reconcile.ts` merge, the `AniListClient` calls, and the
 * `anilist_*` baseline column (`markAniListSync`). The {@link ProviderSyncEngine}
 * drives it without importing any of this.
 *
 * Every read/write here is byte-for-byte the logic that lived inline in the
 * original `AniListSyncService` — moved, not rewritten — so the existing AniList
 * sync + reconcile tests stay green against the engine-backed service.
 */

import { createLogger, extractErrorMessage } from '@shiroani/shared';
import type { AniListClient } from '../anime/anilist-client';
import type { AniListMediaListEntry } from '../anime/types';
import type { LibraryService } from '../library';
import type { AniListSyncRow } from '../library/library.types';
import type {
  ReconcileOutcome,
  SyncEntryAction,
  SyncLocalRow,
  SyncProviderAdapter,
} from '../sync/sync-engine.types';
import {
  buildAddPayloadFromRemote,
  buildPullUpdateFromRemote,
  buildPushInputFromLocal,
  decideMerge,
} from './reconcile';

const logger = createLogger('AniListSyncAdapter');

/** Narrow the generic row back to its concrete AniList projection. */
function asRow(local: SyncLocalRow): AniListSyncRow {
  return local;
}

export class AniListSyncProviderAdapter implements SyncProviderAdapter<AniListMediaListEntry> {
  readonly providerId = 'anilist' as const;

  constructor(
    private readonly client: AniListClient,
    private readonly library: LibraryService
  ) {}

  async getViewerId(): Promise<number> {
    const viewer = await this.client.getViewer();
    return viewer.id;
  }

  getRemoteEntries(viewerId: number): Promise<AniListMediaListEntry[]> {
    return this.client.getMediaListCollection(viewerId);
  }

  getRemoteEntry(mediaId: number, viewerId: number): Promise<AniListMediaListEntry | null> {
    return this.client.getMediaListEntry(mediaId, viewerId);
  }

  providerMediaId(local: SyncLocalRow): number | null {
    return asRow(local).anilistId;
  }

  async importRemote(remote: AniListMediaListEntry): Promise<void> {
    const created = this.library.addEntry(buildAddPayloadFromRemote(remote));
    this.library.markAniListSync(created.id, remote.updatedAt);
  }

  async reconcileMatch(
    local: SyncLocalRow,
    remote: AniListMediaListEntry
  ): Promise<ReconcileOutcome> {
    const row = asRow(local);
    // Backfill the MAL cross-ref for an already-imported row (mal_id is null for
    // every row created before idMal was carried). Runs on every matched row —
    // even an otherwise-unchanged one — so a fully-reconciled library links to
    // MyAnimeList in a single AniList sync.
    this.linkMalIdIfMissing(row, remote);
    const decision = decideMerge(row, remote);
    let finalRemoteUpdatedAt = remote.updatedAt;

    if (decision.localUpdate) {
      this.library.updateEntry(row.id, decision.localUpdate);
    }
    if (decision.remotePush) {
      finalRemoteUpdatedAt = await this.client.saveMediaListEntry({
        mediaId: remote.mediaId,
        ...decision.remotePush,
      });
    }

    // Always refresh the baseline — even for an unchanged entry — so the next run
    // sees this row as reconciled (no false "changed" on either side).
    this.library.markAniListSync(row.id, finalRemoteUpdatedAt);

    return {
      localUpdated: decision.localUpdate != null,
      remoteUpdated: decision.remotePush != null,
      conflict: decision.conflict,
    };
  }

  async pushLocalOnly(local: SyncLocalRow): Promise<void> {
    const row = asRow(local);
    const updatedAt = await this.client.saveMediaListEntry(buildPushInputFromLocal(row));
    this.library.markAniListSync(row.id, updatedAt);
  }

  applyPull(local: SyncLocalRow, remote: AniListMediaListEntry): SyncEntryAction {
    const row = asRow(local);
    this.linkMalIdIfMissing(row, remote);
    const update = buildPullUpdateFromRemote(row, remote);
    if (update) {
      this.library.updateEntry(row.id, update);
      this.library.markAniListSync(row.id, remote.updatedAt);
      return 'updated';
    }
    // Already matching the remote — just refresh the baseline.
    this.library.markAniListSync(row.id, remote.updatedAt);
    return 'unchanged';
  }

  async applyAuto(local: SyncLocalRow, remote: AniListMediaListEntry): Promise<SyncEntryAction> {
    const outcome = await this.reconcileMatch(local, remote);
    return outcome.localUpdated || outcome.remoteUpdated ? 'updated' : 'unchanged';
  }

  /**
   * Link a matched row's `mal_id` from AniList's `idMal` cross-ref when the row is
   * not already linked. This is what lets the MAL sync match by exact id instead
   * of a fragile title search — and it backfills the user's pre-existing library
   * (every row created before `idMal` was carried has `mal_id = null`).
   *
   * No-op when the row is already linked or AniList reports no MAL mapping.
   * `mal_id` is UNIQUE (migration v14), and two AniList media CAN legitimately
   * share an `idMal` (e.g. AniList splits a cours/season that MAL keeps as one
   * entry), so a collision is real but rare: it's caught + logged + swallowed,
   * leaving the second row MAL-unlinked rather than failing the whole entry.
   */
  private linkMalIdIfMissing(row: AniListSyncRow, remote: AniListMediaListEntry): void {
    if (row.malId != null || remote.idMal == null) return;
    try {
      this.library.setMalId(row.id, remote.idMal);
      // Keep the in-memory row consistent so downstream logic in the same run
      // sees the link (the engine re-reads from the DB, but this is cheap safety).
      row.malId = remote.idMal;
    } catch (error) {
      logger.warn(
        `Could not link mal_id=${remote.idMal} for "${row.title}" (id=${row.id}): ${extractErrorMessage(error)}`
      );
    }
  }
}
