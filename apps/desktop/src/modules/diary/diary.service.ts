import { Injectable } from '@nestjs/common';
import {
  createLogger,
  type DiaryEntry,
  type DiaryCreatePayload,
  type DiaryUpdatePayload,
} from '@shiroani/shared';
import {
  DatabaseService,
  getAll,
  getById,
  deleteById,
  buildUpdate,
  type FieldMap,
} from '../database';
import { rowToEntry, type DiaryRow } from './diary.types';

const logger = createLogger('DiaryService');

const TABLE = 'diary_entries';

type DiaryUpdates = Omit<DiaryUpdatePayload, 'id'>;

/** Column/transform map for the dynamic UPDATE builder. Order = emitted SET-clause order. */
const UPDATE_FIELD_MAP: FieldMap<DiaryUpdates> = {
  title: { column: 'title' },
  contentJson: { column: 'content_json' },
  coverGradient: { column: 'cover_gradient' },
  mood: { column: 'mood' },
  tags: { column: 'tags', transform: tags => (tags ? JSON.stringify(tags) : null) },
  animeId: { column: 'anime_id' },
  animeTitle: { column: 'anime_title' },
  animeCoverImage: { column: 'anime_cover_image' },
  isPinned: { column: 'is_pinned', transform: pinned => (pinned ? 1 : 0) },
};

@Injectable()
export class DiaryService {
  constructor(private readonly databaseService: DatabaseService) {
    logger.info('DiaryService initialized');
  }

  /** Get all diary entries, ordered by pinned first then most recently updated. */
  getAllEntries(): DiaryEntry[] {
    return getAll<DiaryRow, DiaryEntry>(
      this.databaseService.db,
      TABLE,
      rowToEntry,
      'is_pinned DESC, updated_at DESC'
    );
  }

  /** Get a single diary entry by its primary key. */
  getEntryById(id: number): DiaryEntry | undefined {
    return getById<DiaryRow, DiaryEntry>(this.databaseService.db, TABLE, id, rowToEntry);
  }

  /** Insert a new diary entry. Returns the created entry. */
  createEntry(payload: DiaryCreatePayload): DiaryEntry {
    const db = this.databaseService.db;

    const result = db
      .prepare(
        `INSERT INTO diary_entries (title, content_json, cover_gradient, mood, tags, anime_id, anime_title, anime_cover_image)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        payload.title,
        payload.contentJson,
        payload.coverGradient ?? null,
        payload.mood ?? null,
        payload.tags ? JSON.stringify(payload.tags) : null,
        payload.animeId ?? null,
        payload.animeTitle ?? null,
        payload.animeCoverImage ?? null
      );

    const entry = this.getEntryById(Number(result.lastInsertRowid));
    if (!entry) throw new Error('Diary entry vanished immediately after INSERT');
    // Log only the id — the title is user-authored content (matches the
    // update/remove lines, which already omit it).
    logger.info(`Created diary entry id=${entry.id}`);
    return entry;
  }

  /** Update an existing diary entry. Returns the updated entry or undefined if not found. */
  updateEntry(id: number, updates: DiaryUpdates): DiaryEntry | undefined {
    const db = this.databaseService.db;

    const built = buildUpdate(TABLE, updates, UPDATE_FIELD_MAP, id);
    if (!built) {
      return this.getEntryById(id);
    }

    db.prepare(built.sql).run(...built.values);

    const entry = this.getEntryById(id);
    if (entry) {
      logger.debug(`Updated diary entry id=${id}`);
    }
    return entry;
  }

  /** Remove a diary entry. Returns true if a row was deleted. */
  removeEntry(id: number): boolean {
    const deleted = deleteById(this.databaseService.db, TABLE, id);
    if (deleted) {
      logger.info(`Removed diary entry id=${id}`);
    }
    return deleted;
  }
}
