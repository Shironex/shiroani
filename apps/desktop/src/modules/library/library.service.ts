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
import { rowToEntry, type AnimeLibraryRow } from './library.types';

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
          (anilist_id, title, title_romaji, title_native, cover_image, total_episodes, status, current_episode, resume_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        payload.anilistId ?? null,
        payload.title,
        payload.titleRomaji ?? null,
        payload.titleNative ?? null,
        payload.coverImage ?? null,
        payload.episodes ?? null,
        payload.status ?? 'plan_to_watch',
        payload.currentEpisode ?? 0,
        payload.resumeUrl ?? null
      );

    const entry = this.getEntryById(Number(result.lastInsertRowid))!;
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
}
