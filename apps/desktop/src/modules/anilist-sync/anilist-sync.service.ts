import { Injectable } from '@nestjs/common';
import {
  createLogger,
  extractErrorMessage,
  type AniListSyncProgress,
  type AniListSyncResult,
  type AniListSyncAction,
} from '@shiroani/shared';
import { AniListClient } from '../anime/anilist-client';
import { AniListTokenPort } from '../anime/anilist-token.port';
import { LibraryService } from '../library';
import type { AniListMediaListEntry } from '../anime/types';
import type { AniListSyncRow } from '../library/library.types';
import { buildAddPayloadFromRemote, buildPushInputFromLocal, decideMerge } from './reconcile';

const logger = createLogger('AniListSyncService');

/** Thrown when a sync is requested while one is already running (single-flight). */
export const SYNC_IN_PROGRESS_ERROR = 'AniList sync is already running';
/** Thrown when sync is requested without a connected AniList account. */
export const SYNC_NOT_CONNECTED_ERROR = 'AniList account is not connected';

function emptyResult(): AniListSyncResult {
  return {
    imported: 0,
    pushedNew: 0,
    updatedLocal: 0,
    updatedRemote: 0,
    unchanged: 0,
    conflicts: 0,
    skippedNoId: 0,
    errors: 0,
  };
}

@Injectable()
export class AniListSyncService {
  /** Single-flight guard: only one sync may run at a time per process. */
  private running = false;

  constructor(
    private readonly anilistClient: AniListClient,
    private readonly libraryService: LibraryService,
    private readonly tokenPort: AniListTokenPort
  ) {
    logger.info('AniListSyncService initialized');
  }

  /**
   * Run a full two-way sync. Reports per-entry progress via `onProgress` and
   * resolves with the final tally.
   *
   * @throws if a sync is already running, or no AniList account is connected.
   */
  async sync(onProgress: (progress: AniListSyncProgress) => void): Promise<AniListSyncResult> {
    // Claim the single-flight slot SYNCHRONOUSLY — before any `await` — so a
    // second concurrent call can't slip past the guard during the gap an await
    // would open (a TOCTOU race that would double-run the sync).
    if (this.running) {
      throw new Error(SYNC_IN_PROGRESS_ERROR);
    }
    this.running = true;

    const result = emptyResult();

    try {
      const token = await this.tokenPort.getAccessToken();
      if (!token) {
        throw new Error(SYNC_NOT_CONNECTED_ERROR);
      }

      const viewer = await this.anilistClient.getViewer();
      const remoteEntries = await this.anilistClient.getMediaListCollection(viewer.id);
      const localEntries = this.libraryService.getEntriesForSync();

      // AniList returns the same media once per list it belongs to (its status
      // list PLUS any custom lists), so `remoteEntries` can contain duplicate
      // mediaIds. Dedup by mediaId — keeping the most recently updated occurrence —
      // so each media is reconciled exactly once and a remote-only entry is never
      // double-inserted against the UNIQUE `anilist_id` constraint.
      const remoteById = new Map<number, AniListMediaListEntry>();
      for (const entry of remoteEntries) {
        const existing = remoteById.get(entry.mediaId);
        if (!existing || entry.updatedAt > existing.updatedAt) {
          remoteById.set(entry.mediaId, entry);
        }
      }
      const remoteUnique = [...remoteById.values()];

      const localById = new Map<number, AniListSyncRow>();
      for (const row of localEntries) {
        if (row.anilistId != null) localById.set(row.anilistId, row);
      }

      // Work items: every unique remote entry, every local-only entry (with or
      // without an AniList id).
      const localOnly = localEntries.filter(
        row => row.anilistId == null || !remoteById.has(row.anilistId)
      );
      const total = remoteUnique.length + localOnly.length;
      let current = 0;

      const report = (title: string, action: AniListSyncAction): void => {
        current += 1;
        onProgress({ current, total, title, action });
      };

      // 1. Remote entries: import new, or reconcile existing matches.
      for (const remote of remoteUnique) {
        try {
          const local = localById.get(remote.mediaId);
          if (!local) {
            const created = this.libraryService.addEntry(buildAddPayloadFromRemote(remote));
            this.libraryService.markAniListSync(created.id, remote.updatedAt);
            result.imported += 1;
            report(remote.title, 'imported');
            continue;
          }

          // Optimistic concurrency guard: the snapshot was taken at the start of
          // the run, but the user can edit OR delete a library entry while the
          // (potentially multi-minute) sync is in flight. Re-read the row right
          // before writing; skip it this run if it changed since the snapshot
          // (don't clobber the fresh edit) or vanished (don't write a deleted row
          // / push a just-deleted entry to AniList). It reconciles on the next sync.
          const current = this.libraryService.getEntryById(local.id);
          if (!current || current.updatedAt !== local.updatedAt) {
            report(local.title, 'unchanged');
            continue;
          }

          const decision = decideMerge(local, remote);
          let finalRemoteUpdatedAt = remote.updatedAt;

          if (decision.localUpdate) {
            this.libraryService.updateEntry(local.id, decision.localUpdate);
          }
          if (decision.remotePush) {
            finalRemoteUpdatedAt = await this.anilistClient.saveMediaListEntry({
              mediaId: remote.mediaId,
              ...decision.remotePush,
            });
          }

          // Always refresh baselines — even for an unchanged entry — so the next
          // run sees this row as reconciled (no false "changed" on either side).
          this.libraryService.markAniListSync(local.id, finalRemoteUpdatedAt);

          // Tally only after all writes for this entry succeed, so an entry is
          // counted once — never in both a success counter AND `errors` if a write
          // throws partway through.
          if (decision.localUpdate) result.updatedLocal += 1;
          if (decision.remotePush) result.updatedRemote += 1;
          if (decision.conflict) result.conflicts += 1;

          if (decision.localUpdate || decision.remotePush) {
            report(local.title, 'updated');
          } else {
            result.unchanged += 1;
            report(local.title, 'unchanged');
          }
        } catch (error) {
          result.errors += 1;
          logger.error(
            `Failed to sync remote entry ${remote.mediaId}: ${extractErrorMessage(error)}`
          );
          report(remote.title, 'error');
        }
      }

      // 2. Local-only entries: create on AniList (full mirror) when they have a
      //    resolvable AniList id; otherwise skip (no mediaId to write).
      for (const local of localOnly) {
        try {
          if (local.anilistId == null) {
            result.skippedNoId += 1;
            report(local.title, 'skipped');
            continue;
          }
          // Guard against a remote entry that appeared after the snapshot — only
          // truly remote-absent locals reach here, but re-checking is cheap.
          if (remoteById.has(local.anilistId)) {
            continue;
          }
          const updatedAt = await this.anilistClient.saveMediaListEntry(
            buildPushInputFromLocal(local)
          );
          this.libraryService.markAniListSync(local.id, updatedAt);
          result.pushedNew += 1;
          report(local.title, 'pushed');
        } catch (error) {
          result.errors += 1;
          logger.error(`Failed to push local entry ${local.id}: ${extractErrorMessage(error)}`);
          report(local.title, 'error');
        }
      }

      logger.info(
        `AniList sync complete: imported=${result.imported} pushedNew=${result.pushedNew} ` +
          `updatedLocal=${result.updatedLocal} updatedRemote=${result.updatedRemote} ` +
          `unchanged=${result.unchanged} conflicts=${result.conflicts} ` +
          `skippedNoId=${result.skippedNoId} errors=${result.errors}`
      );

      return result;
    } finally {
      this.running = false;
    }
  }
}
