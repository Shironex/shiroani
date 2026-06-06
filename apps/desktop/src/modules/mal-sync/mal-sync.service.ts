import { Injectable, Optional } from '@nestjs/common';
import {
  createLogger,
  extractErrorMessage,
  type SyncProgress,
  type SyncResult,
  type SyncAction,
  type SyncEntryDirection,
} from '@shiroani/shared';
import { MalClient } from '../anime/mal-client';
import { AniListClient } from '../anime/anilist-client';
import { MalTokenPort } from '../anime/mal-token.port';
import { LibraryService } from '../library';
import type { AniListSyncRow } from '../library/library.types';
import { ProviderSyncEngine } from '../sync/provider-sync-engine';
import { MalSyncProviderAdapter, type MalSyncRemoteEntry } from './mal-sync.adapter';

const logger = createLogger('MalSyncService');

/** Thrown when a MAL sync is requested while one is already running (single-flight). */
export const MAL_SYNC_IN_PROGRESS_ERROR = 'MAL sync is already running';
/** Thrown when MAL sync is requested without a connected MAL account. */
export const MAL_SYNC_NOT_CONNECTED_ERROR = 'MAL account is not connected';
/** Thrown when a single-entry MAL sync targets a local row that does not exist. */
export const MAL_SYNC_ENTRY_NOT_FOUND_ERROR = 'Library entry not found';

@Injectable()
export class MalSyncService {
  /**
   * Single-flight guard, INDEPENDENT of AniList's. A MAL sync and an AniList sync
   * may run concurrently (they touch different baseline columns + different
   * remotes) — only two MAL syncs are mutually exclusive.
   */
  private running = false;

  /**
   * Provider-agnostic orchestration engine wired to the MAL adapter. The adapter
   * owns the MAL merge + MAL I/O + the `mal_*` baseline; the engine owns dedup /
   * snapshot / optimistic re-read / loop / tally. Plain `new` (not Nest DI) so
   * this service keeps a `(client, library, tokenPort)` constructor the unit
   * tests construct directly — mirroring {@link AniListSyncService}.
   */
  private readonly adapter: MalSyncProviderAdapter;
  private readonly engine: ProviderSyncEngine<MalSyncRemoteEntry>;

  constructor(
    private readonly malClient: MalClient,
    private readonly libraryService: LibraryService,
    private readonly tokenPort: MalTokenPort,
    // Optional so the unit tests can construct the service with the 3 core deps.
    // Used ONLY for the idMal link pre-pass; absent → the pre-pass is a no-op.
    @Optional() private readonly aniListClient?: AniListClient
  ) {
    this.adapter = new MalSyncProviderAdapter(this.malClient, this.libraryService);
    this.engine = new ProviderSyncEngine(this.adapter, this.libraryService);
    logger.info('MalSyncService initialized');
  }

  /**
   * Run a full two-way MAL sync. Reports per-entry progress via `onProgress` and
   * resolves with the final tally.
   *
   * Before the engine runs, a backfill pre-pass best-effort resolves `mal_id` for
   * titled-but-unlinked rows (the engine's `providerMediaId` is synchronous, so a
   * row MUST be linked before the snapshot to be pushable; an unresolved one stays
   * `skippedNoId`, mirroring AniList).
   *
   * @throws if a MAL sync is already running, or no MAL account is connected.
   */
  async sync(onProgress: (progress: SyncProgress) => void): Promise<SyncResult> {
    // Claim the single-flight slot SYNCHRONOUSLY — before any `await` — so a
    // second concurrent MAL sync can't slip past during an await gap (TOCTOU).
    if (this.running) {
      throw new Error(MAL_SYNC_IN_PROGRESS_ERROR);
    }
    this.running = true;

    try {
      await this.assertConnected();
      // Order-independence: link mal_id on AniList rows from AniList's idMal BEFORE
      // the import loop, so a MAL-first sync matches them by id instead of importing
      // duplicates. Then the title-search backfill handles the remaining local-only
      // rows (no anilistId).
      await this.linkAniListIdMal();
      await this.adapter.backfillMalIds();
      return await this.engine.runFullSync(onProgress);
    } finally {
      this.running = false;
    }
  }

  /**
   * Sync a SINGLE library entry, with a forced direction or auto-merge. Shares
   * the same shape as {@link AniListSyncService.syncEntry} but on the MAL single-
   * flight guard. For `push`/`auto`, a single-row backfill pre-pass resolves a
   * missing `mal_id` by title first (same reason as the full sync).
   *
   * @throws MAL_SYNC_IN_PROGRESS_ERROR if a MAL sync is already running
   * @throws MAL_SYNC_NOT_CONNECTED_ERROR if no MAL account is connected
   * @throws MAL_SYNC_ENTRY_NOT_FOUND_ERROR if the local row does not exist
   */
  async syncEntry(localId: number, direction: SyncEntryDirection): Promise<{ action: SyncAction }> {
    if (this.running) {
      throw new Error(MAL_SYNC_IN_PROGRESS_ERROR);
    }
    this.running = true;

    try {
      await this.assertConnected();

      // The engine treats a missing row as a soft skip; the MAL contract throws
      // NOT_FOUND — resolve the row presence here first to keep that behaviour.
      const row = this.libraryService.getSyncRowById(localId);
      if (!row) {
        throw new Error(MAL_SYNC_ENTRY_NOT_FOUND_ERROR);
      }

      // push/auto may need to create a remote entry → resolve a missing mal_id
      // first: prefer AniList's exact idMal, then fall back to a title search.
      // (pull only reads an existing link, so no backfill needed.)
      if (direction !== 'pull') {
        await this.linkAniListIdMalForRow(row);
        await this.adapter.backfillMalIdForRow(this.libraryService.getSyncRowById(localId) ?? row);
      }

      const { action } = await this.engine.runEntrySync(localId, direction);
      return { action };
    } finally {
      this.running = false;
    }
  }

  /**
   * Pre-pass: link `mal_id` on AniList-sourced rows from AniList's `idMal`
   * cross-ref, BEFORE the engine's import loop. This is what makes MAL sync
   * order-independent — without it a MAL-first run (before any AniList sync) finds
   * no `mal_id` on the AniList rows, imports a duplicate for every overlapping
   * anime, and a later AniList sync can't undo it (the dup holds the UNIQUE id).
   *
   * No-op when there is no AniList client / it isn't connected (can't resolve
   * idMal), or when every AniList row is already linked (skips a needless AniList
   * round-trip on steady-state syncs). Per-row UNIQUE collisions — a pre-existing
   * MAL-only dup already holds the id — are caught + skipped, never aborting.
   */
  private async linkAniListIdMal(): Promise<void> {
    if (!this.aniListClient || !(await this.aniListClient.hasToken())) return;

    const rows = this.libraryService.getEntriesForSync();
    // Skip the AniList round-trip once every AniList row is linked. NOTE: a row
    // AniList genuinely has no `idMal` for stays unlinked, so this stays true and
    // re-fetches the collection on each MAL sync — by design (cheap, and the row
    // could gain a MAL mapping later); it is not a bug.
    if (!rows.some(r => r.anilistId != null && r.malId == null)) return;

    let idMalByAnilistId: Map<number, number>;
    try {
      const viewer = await this.aniListClient.getViewer();
      const entries = await this.aniListClient.getMediaListCollection(viewer.id);
      idMalByAnilistId = new Map();
      for (const entry of entries) {
        if (entry.idMal != null) idMalByAnilistId.set(entry.mediaId, entry.idMal);
      }
    } catch (error) {
      logger.warn(`[mal] AniList idMal pre-pass skipped: ${extractErrorMessage(error)}`);
      return;
    }

    let linked = 0;
    for (const row of rows) {
      if (row.anilistId == null || row.malId != null) continue;
      const idMal = idMalByAnilistId.get(row.anilistId);
      if (idMal == null) continue;
      try {
        this.libraryService.setMalId(row.id, idMal);
        linked += 1;
      } catch (error) {
        // mal_id is UNIQUE; a pre-existing MAL-only dup may already hold this id.
        logger.warn(
          `[mal] could not link mal_id=${idMal} for "${row.title}" (id=${row.id}): ${extractErrorMessage(error)}`
        );
      }
    }
    if (linked > 0) logger.info(`[mal] idMal pre-pass linked ${linked} AniList row(s)`);
  }

  /**
   * Single-row variant of {@link linkAniListIdMal} for {@link syncEntry}: link one
   * AniList-sourced row's `mal_id` from its AniList `idMal` before a push/auto.
   * No-op when the row has no `anilistId`, is already linked, or AniList isn't
   * connected. Errors are isolated (never throw from a per-entry sync).
   */
  private async linkAniListIdMalForRow(row: AniListSyncRow): Promise<void> {
    if (row.anilistId == null || row.malId != null) return;
    if (!this.aniListClient || !(await this.aniListClient.hasToken())) return;
    try {
      const viewer = await this.aniListClient.getViewer();
      const entry = await this.aniListClient.getMediaListEntry(row.anilistId, viewer.id);
      if (entry?.idMal == null) return;
      this.libraryService.setMalId(row.id, entry.idMal);
    } catch (error) {
      logger.warn(
        `[mal] could not link mal_id for "${row.title}" (id=${row.id}): ${extractErrorMessage(error)}`
      );
    }
  }

  /** Resolve the access token and throw the not-connected error when absent. */
  private async assertConnected(): Promise<void> {
    const token = await this.tokenPort.getAccessToken();
    if (!token) {
      throw new Error(MAL_SYNC_NOT_CONNECTED_ERROR);
    }
  }
}
