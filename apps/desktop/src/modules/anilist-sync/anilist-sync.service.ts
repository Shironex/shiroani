import { Injectable } from '@nestjs/common';
import {
  createLogger,
  type AniListSyncProgress,
  type AniListSyncResult,
  type AniListSyncAction,
  type AniListSyncEntryDirection,
} from '@shiroani/shared';
import { AniListClient } from '../anime/anilist-client';
import { AniListTokenPort } from '../anime/anilist-token.port';
import { LibraryService } from '../library';
import type { AniListMediaListEntry } from '../anime/types';
import { ProviderSyncEngine } from '../sync/provider-sync-engine';
import { AniListSyncProviderAdapter } from './anilist-sync.adapter';

const logger = createLogger('AniListSyncService');

/** Thrown when a sync is requested while one is already running (single-flight). */
export const SYNC_IN_PROGRESS_ERROR = 'AniList sync is already running';
/** Thrown when sync is requested without a connected AniList account. */
export const SYNC_NOT_CONNECTED_ERROR = 'AniList account is not connected';
/** Thrown when a single-entry sync targets a local row that does not exist. */
export const SYNC_ENTRY_NOT_FOUND_ERROR = 'Library entry not found';

@Injectable()
export class AniListSyncService {
  /** Single-flight guard: only one sync may run at a time per process. */
  private running = false;

  /**
   * The provider-agnostic orchestration engine, wired to the AniList adapter. The
   * adapter owns the merge + AniList I/O; the engine owns dedup / snapshot /
   * optimistic re-read / loop / tally. Constructed with plain `new` (not Nest DI)
   * so this service keeps its `(client, library, tokenPort)` constructor — the one
   * the unit tests construct directly.
   */
  private readonly engine: ProviderSyncEngine<AniListMediaListEntry>;

  constructor(
    private readonly anilistClient: AniListClient,
    private readonly libraryService: LibraryService,
    private readonly tokenPort: AniListTokenPort
  ) {
    this.engine = new ProviderSyncEngine(
      new AniListSyncProviderAdapter(this.anilistClient, this.libraryService),
      this.libraryService
    );
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

    try {
      await this.assertConnected();
      return await this.engine.runFullSync(onProgress);
    } finally {
      this.running = false;
    }
  }

  /**
   * Sync a SINGLE library entry, with a forced direction or auto-merge.
   *
   * - `push` — overwrite the AniList entry from the local row (local wins). No
   *   remote read needed.
   * - `pull` — overwrite the local row from the AniList entry (remote wins). If
   *   there is no remote entry, nothing to pull → `skipped`.
   * - `auto` — run the same merge a full sync would; if no remote entry exists,
   *   push the local-only entry (mirrors the full sync).
   *
   * Shares the full sync's single-flight guard and applies the same optimistic
   * re-read guard before any local write.
   *
   * @throws SYNC_IN_PROGRESS_ERROR if a sync is already running
   * @throws SYNC_NOT_CONNECTED_ERROR if no AniList account is connected
   * @throws SYNC_ENTRY_NOT_FOUND_ERROR if the local row does not exist
   */
  async syncEntry(
    localId: number,
    direction: AniListSyncEntryDirection
  ): Promise<{ action: AniListSyncAction }> {
    // Claim the single-flight slot SYNCHRONOUSLY (before any await), exactly like
    // `sync()` — so a per-entry op and a full sync can never overlap.
    if (this.running) {
      throw new Error(SYNC_IN_PROGRESS_ERROR);
    }
    this.running = true;

    try {
      await this.assertConnected();

      // The engine treats a missing row as a soft skip; the AniList contract throws
      // SYNC_ENTRY_NOT_FOUND_ERROR — so resolve the row presence here first to keep
      // that behaviour (the gateway/tests rely on the throw).
      if (!this.libraryService.getSyncRowById(localId)) {
        throw new Error(SYNC_ENTRY_NOT_FOUND_ERROR);
      }

      const { action } = await this.engine.runEntrySync(localId, direction);
      return { action };
    } finally {
      this.running = false;
    }
  }

  /** Resolve the access token and throw the not-connected error when absent. */
  private async assertConnected(): Promise<void> {
    const token = await this.tokenPort.getAccessToken();
    if (!token) {
      throw new Error(SYNC_NOT_CONNECTED_ERROR);
    }
  }
}
