import { Injectable } from '@nestjs/common';
import {
  createLogger,
  type AnimeEntry,
  type AnimeStatus,
  type LibraryAddPayload,
  type LibraryUpdatePayload,
  type LibraryStatsResult,
} from '@shiroani/shared';
import {
  DatabaseService,
  getAll,
  getById,
  deleteById,
  buildUpdate,
  type FieldMap,
} from '../database';
import {
  rowToEntry,
  rowToSyncRow,
  type AnimeLibraryRow,
  type AniListSyncRow,
} from './library.types';

const logger = createLogger('LibraryService');

const TABLE = 'anime_library';

type LibraryUpdates = Omit<LibraryUpdatePayload, 'id'>;

/** Column/transform map for the dynamic UPDATE builder. Order = emitted SET-clause order. */
const UPDATE_FIELD_MAP: FieldMap<LibraryUpdates> = {
  anilistId: { column: 'anilist_id' },
  status: { column: 'status' },
  currentEpisode: { column: 'current_episode' },
  score: { column: 'score' },
  notes: { column: 'notes' },
  resumeUrl: { column: 'resume_url' },
};

@Injectable()
export class LibraryService {
  constructor(private readonly databaseService: DatabaseService) {
    logger.info('LibraryService initialized');
  }

  /** Get all library entries, optionally filtered by status. */
  getAllEntries(status?: AnimeStatus): AnimeEntry[] {
    const db = this.databaseService.db;

    if (status) {
      const rows = db
        .prepare('SELECT * FROM anime_library WHERE status = ? ORDER BY updated_at DESC')
        .all(status) as AnimeLibraryRow[];
      return rows.map(rowToEntry);
    }

    return getAll<AnimeLibraryRow, AnimeEntry>(db, TABLE, rowToEntry, 'updated_at DESC');
  }

  /** Get a single entry by its primary key. */
  getEntryById(id: number): AnimeEntry | undefined {
    return getById<AnimeLibraryRow, AnimeEntry>(this.databaseService.db, TABLE, id, rowToEntry);
  }

  /** Get a single entry by its AniList ID. */
  getEntryByAnilistId(anilistId: number): AnimeEntry | undefined {
    const db = this.databaseService.db;
    const row = db.prepare('SELECT * FROM anime_library WHERE anilist_id = ?').get(anilistId) as
      | AnimeLibraryRow
      | undefined;
    return row ? rowToEntry(row) : undefined;
  }

  /** Insert a new anime into the library. Returns the created entry. */
  addEntry(payload: LibraryAddPayload): AnimeEntry {
    const db = this.databaseService.db;

    const result = db
      .prepare(
        `INSERT INTO anime_library
          (anilist_id, mal_id, title, title_romaji, title_native, cover_image, total_episodes, status, current_episode, score, notes, resume_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        payload.anilistId ?? null,
        payload.malId ?? null,
        payload.title,
        payload.titleRomaji ?? null,
        payload.titleNative ?? null,
        payload.coverImage ?? null,
        payload.episodes ?? null,
        payload.status ?? 'plan_to_watch',
        payload.currentEpisode ?? 0,
        payload.score ?? null,
        payload.notes ?? null,
        payload.resumeUrl ?? null
      );

    const entry = this.getEntryById(Number(result.lastInsertRowid));
    if (!entry) throw new Error('Library entry vanished immediately after INSERT');
    logger.info(`Added "${entry.title}" to library (id=${entry.id})`);
    return entry;
  }

  /** Update an existing anime entry. Returns the updated entry or undefined if not found. */
  updateEntry(id: number, updates: LibraryUpdates): AnimeEntry | undefined {
    const db = this.databaseService.db;

    const built = buildUpdate(TABLE, updates, UPDATE_FIELD_MAP, id);
    if (!built) {
      return this.getEntryById(id);
    }

    db.prepare(built.sql).run(...built.values);

    const entry = this.getEntryById(id);
    if (entry) {
      logger.debug(`Updated entry id=${id}`);
    }
    return entry;
  }

  /** Remove an anime from the library. Returns true if a row was deleted. */
  removeEntry(id: number): boolean {
    const deleted = deleteById(this.databaseService.db, TABLE, id);
    if (deleted) {
      logger.info(`Removed entry id=${id} from library`);
    }
    return deleted;
  }

  /**
   * Remove many entries in ONE transaction. Returns the ids actually deleted
   * (rows that existed) so the gateway can broadcast a precise removal set.
   *
   * A single call replaces the N individual {@link removeEntry} round-trips the
   * batch action bar used to fire — those tripped the WS throttler on a large
   * selection. Atomic: a failure mid-batch rolls the whole delete back, so the
   * client's optimistic removal and the DB never disagree on a partial set.
   */
  removeMany(ids: number[]): number[] {
    const db = this.databaseService.db;
    const stmt = db.prepare(`DELETE FROM ${TABLE} WHERE id = ?`);
    const run = db.transaction((rows: number[]): number[] => {
      const deleted: number[] = [];
      for (const id of rows) {
        if (stmt.run(id).changes > 0) deleted.push(id);
      }
      return deleted;
    });
    const deleted = run(ids);
    if (deleted.length > 0) {
      logger.info(`Removed ${deleted.length} entries from library (bulk)`);
    }
    return deleted;
  }

  /**
   * Apply the SAME field updates to many entries in ONE transaction. Returns the
   * updated entries (only rows that still existed). The bulk twin of
   * {@link updateEntry}: same `buildUpdate` SET clauses (incl. the `updated_at`
   * bump that marks the rows as fresh local edits for the next sync), coalesced
   * into a single statement re-run per id so a large selection is one socket
   * emit instead of N. Atomic — a mid-batch failure rolls the whole update back.
   */
  updateMany(ids: number[], updates: LibraryUpdates): AnimeEntry[] {
    const db = this.databaseService.db;

    // Build the dynamic UPDATE once (the SET clauses are identical for every
    // id); a null result means no updatable field was supplied — the gateway
    // schema already rejects that, but guard so an empty update can't run.
    const built = buildUpdate(TABLE, updates, UPDATE_FIELD_MAP, 0);
    if (!built) return [];
    // `buildUpdate` appends the id as the final bind value; swap it per row.
    const setValues = built.values.slice(0, -1);
    const stmt = db.prepare(built.sql);

    const run = db.transaction((rows: number[]): AnimeEntry[] => {
      const updated: AnimeEntry[] = [];
      for (const id of rows) {
        stmt.run(...setValues, id);
        const entry = this.getEntryById(id);
        if (entry) updated.push(entry);
      }
      return updated;
    });
    const updated = run(ids);
    if (updated.length > 0) {
      logger.debug(`Updated ${updated.length} entries (bulk)`);
    }
    return updated;
  }

  /** Get counts of entries grouped by status. */
  getStats(): LibraryStatsResult {
    const db = this.databaseService.db;
    const rows = db
      .prepare('SELECT status, COUNT(*) as count FROM anime_library GROUP BY status')
      .all() as { status: string; count: number }[];

    const stats: LibraryStatsResult = {
      watching: 0,
      completed: 0,
      plan_to_watch: 0,
      on_hold: 0,
      dropped: 0,
      total: 0,
    };

    for (const row of rows) {
      const key = row.status as keyof Omit<LibraryStatsResult, 'total'>;
      if (key in stats) {
        stats[key] = row.count;
      }
      stats.total += row.count;
    }

    return stats;
  }

  /**
   * Project every library entry for AniList reconciliation, carrying the sync
   * baselines. Main-side only — these rows are never sent to the renderer.
   */
  getEntriesForSync(): AniListSyncRow[] {
    const rows = this.databaseService.db
      .prepare('SELECT * FROM anime_library')
      .all() as AnimeLibraryRow[];
    return rows.map(rowToSyncRow);
  }

  /**
   * Project a single library entry for AniList reconciliation, carrying the sync
   * baselines. Main-side only — the {@link AniListSyncRow} is never sent to the
   * renderer. Used by single-entry sync to feed `decideMerge`.
   */
  getSyncRowById(id: number): AniListSyncRow | undefined {
    const row = this.databaseService.db
      .prepare('SELECT * FROM anime_library WHERE id = ?')
      .get(id) as AnimeLibraryRow | undefined;
    return row ? rowToSyncRow(row) : undefined;
  }

  /**
   * Stamp the AniList sync baselines for an entry WITHOUT touching `updated_at`.
   *
   * This is intentionally NOT routed through {@link updateEntry} / `buildUpdate`,
   * which always bumps `updated_at = datetime('now')` — that bump is exactly what
   * would make the next sync misread a just-reconciled row as a fresh local edit
   * (the ping-pong the baselines exist to prevent). `anilist_synced_at` uses the
   * same `datetime('now')` clock/format as `updated_at` so the reconciler can
   * compare them directly.
   *
   * @param id - library row id
   * @param remoteUpdatedAt - the AniList entry `updatedAt` (epoch seconds) just observed
   */
  markAniListSync(id: number, remoteUpdatedAt: number): void {
    this.databaseService.db
      .prepare(
        `UPDATE anime_library
           SET anilist_synced_at = datetime('now'), anilist_remote_updated_at = ?
         WHERE id = ?`
      )
      .run(remoteUpdatedAt, id);
  }

  /**
   * Stamp the MyAnimeList sync baselines for an entry WITHOUT touching `updated_at`.
   *
   * The MAL twin of {@link markAniListSync}: same anti-ping-pong rationale (a bare
   * `updated_at` bump would make the next sync misread a just-reconciled row as a
   * fresh local edit) and the same `datetime('now')` clock/format so the
   * reconciler can compare `mal_synced_at` against `updated_at` directly.
   *
   * @param id - library row id
   * @param remoteUpdatedAt - the MAL entry `updated_at` (epoch seconds) just observed
   */
  markMalSync(id: number, remoteUpdatedAt: number): void {
    this.databaseService.db
      .prepare(
        `UPDATE anime_library
           SET mal_synced_at = datetime('now'), mal_remote_updated_at = ?
         WHERE id = ?`
      )
      .run(remoteUpdatedAt, id);
  }

  /**
   * Backfill a row's `mal_id` (the link the MAL sync needs to write/read a
   * remote entry) WITHOUT touching `updated_at` — a bare timestamp bump would
   * make the next sync misread the just-linked row as a fresh local edit, the
   * same anti-ping-pong rationale as {@link markMalSync}.
   *
   * The `mal_id` column has a UNIQUE index (migration v14): backfill resolves
   * ids from a NULLABLE, non-unique source (`searchAnime` or AniList `idMal`),
   * so two local rows CAN resolve to the same MAL id. This rethrows the SQLite
   * UNIQUE violation so the caller can skip+log that one row and CONTINUE the
   * run (never abort) — mirroring the AniList dedup-by-id defensive shape.
   *
   * @param id - library row id
   * @param malId - the resolved MyAnimeList anime id
   * @throws the SQLite UNIQUE-constraint error when `malId` already links another row
   */
  setMalId(id: number, malId: number): void {
    this.databaseService.db
      .prepare(`UPDATE anime_library SET mal_id = ? WHERE id = ?`)
      .run(malId, id);
  }
}
