import { Inject, Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import Database from 'better-sqlite3';
import { createLogger } from '@shiroani/shared';
import { runMigrations } from './migrations';
import { DATABASE_PATH } from './database.tokens';

const logger = createLogger('DatabaseService');

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private _db!: Database.Database;

  constructor(@Inject(DATABASE_PATH) private readonly dbPath: string) {}

  /** Expose the raw better-sqlite3 instance for other services. */
  get db(): Database.Database {
    return this._db;
  }

  onModuleInit(): void {
    logger.info('Opening database');

    this._db = new Database(this.dbPath);

    // Performance and safety pragmas
    this._db.pragma('journal_mode = WAL');
    this._db.pragma('foreign_keys = ON');
    this._db.pragma('busy_timeout = 5000');
    this._db.pragma('synchronous = NORMAL');

    runMigrations(this._db);

    logger.info('Database initialized successfully');
  }

  onModuleDestroy(): void {
    if (this._db) {
      this._db.close();
      logger.info('Database connection closed');
    }
  }

  /**
   * Wipe all user data: delete every row from every user table while preserving
   * the schema and the `_migrations` ledger, then reset AUTOINCREMENT counters
   * so a post-wipe database is equivalent to a fresh install.
   *
   * Backs the Settings → Data "Delete all data" factory reset. Tables are
   * enumerated dynamically from `sqlite_master` so new tables — and the
   * `resolve_cache` branch tables that exist on some local DBs — are covered
   * without being hardcoded here. Every foreign key in the schema is
   * `ON DELETE CASCADE` or `SET NULL` (no `RESTRICT`), so deletion order is
   * irrelevant: emptying a parent cascades into its children harmlessly.
   */
  clearAllData(): void {
    const db = this._db;

    const tables = db
      .prepare(
        `SELECT name FROM sqlite_master
         WHERE type = 'table'
           AND name NOT LIKE 'sqlite_%'
           AND name != '_migrations'`
      )
      .all() as Array<{ name: string }>;

    const hasSequence =
      db
        .prepare(`SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'sqlite_sequence'`)
        .get() !== undefined;

    const wipe = db.transaction(() => {
      for (const { name } of tables) {
        // Names come from sqlite_master (never user input); quote defensively.
        db.prepare(`DELETE FROM "${name}"`).run();
      }
      if (hasSequence) {
        // Reset AUTOINCREMENT so ids restart at 1, matching a fresh install.
        db.prepare('DELETE FROM sqlite_sequence').run();
      }
    });

    wipe();

    // Reclaim the freed pages so the on-disk file shrinks to fresh-install size.
    // VACUUM cannot run inside a transaction, so it follows the wipe; failure is
    // non-fatal (the data is already gone) — log and move on.
    try {
      db.exec('VACUUM');
    } catch (error) {
      logger.warn('VACUUM after clearAllData failed (data already cleared)', error);
    }

    logger.info(`Cleared all data from ${tables.length} table(s)`);
  }
}
