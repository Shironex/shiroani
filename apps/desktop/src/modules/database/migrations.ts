import type Database from 'better-sqlite3';
import { createLogger } from '@shiroani/shared';

const logger = createLogger('Migrations');

interface Migration {
  version: number;
  description: string;
  up: string;
}

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    description: 'Create anime_library table',
    up: `
      CREATE TABLE IF NOT EXISTS anime_library (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        anilist_id INTEGER UNIQUE,
        title TEXT NOT NULL,
        title_romaji TEXT,
        title_native TEXT,
        cover_image TEXT,
        total_episodes INTEGER,
        status TEXT NOT NULL DEFAULT 'plan_to_watch',
        current_episode INTEGER NOT NULL DEFAULT 0,
        score INTEGER,
        notes TEXT,
        resume_url TEXT,
        added_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_anime_library_status ON anime_library(status);
      CREATE INDEX IF NOT EXISTS idx_anime_library_anilist_id ON anime_library(anilist_id);
    `,
  },
  {
    version: 2,
    description: 'Create bookmarks table',
    up: `
      CREATE TABLE IF NOT EXISTS bookmarks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT NOT NULL,
        title TEXT NOT NULL,
        favicon TEXT,
        folder TEXT DEFAULT 'default',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_bookmarks_folder ON bookmarks(folder);
    `,
  },
  {
    version: 3,
    description: 'Create watch_history table',
    up: `
      CREATE TABLE IF NOT EXISTS watch_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        anime_id INTEGER NOT NULL REFERENCES anime_library(id) ON DELETE CASCADE,
        episode_number INTEGER NOT NULL,
        watched_url TEXT,
        watched_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(anime_id, episode_number)
      );
    `,
  },
  {
    version: 4,
    description: 'Create diary_entries table',
    up: `
      CREATE TABLE IF NOT EXISTS diary_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL DEFAULT '',
        content_json TEXT NOT NULL DEFAULT '{}',
        cover_gradient TEXT,
        mood TEXT,
        tags TEXT,
        anime_id INTEGER REFERENCES anime_library(id) ON DELETE SET NULL,
        anime_title TEXT,
        anime_cover_image TEXT,
        is_pinned INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_diary_created ON diary_entries(created_at);
      CREATE INDEX IF NOT EXISTS idx_diary_pinned ON diary_entries(is_pinned);
    `,
  },
  {
    version: 5,
    description: 'Create feed_sources and feed_items tables',
    up: `
      CREATE TABLE IF NOT EXISTS feed_sources (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        url TEXT NOT NULL UNIQUE,
        site_url TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'news',
        language TEXT NOT NULL DEFAULT 'en',
        color TEXT NOT NULL DEFAULT '#666666',
        icon TEXT,
        enabled INTEGER NOT NULL DEFAULT 1,
        poll_interval_minutes INTEGER NOT NULL DEFAULT 60,
        last_fetched_at TEXT,
        last_etag TEXT,
        consecutive_failures INTEGER NOT NULL DEFAULT 0,
        last_error TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_feed_sources_enabled ON feed_sources(enabled);
      CREATE INDEX IF NOT EXISTS idx_feed_sources_category ON feed_sources(category);

      CREATE TABLE IF NOT EXISTS feed_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        feed_source_id INTEGER NOT NULL REFERENCES feed_sources(id) ON DELETE CASCADE,
        guid TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        url TEXT NOT NULL,
        author TEXT,
        image_url TEXT,
        published_at TEXT,
        categories TEXT,
        content_hash TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(feed_source_id, guid)
      );
      CREATE INDEX IF NOT EXISTS idx_feed_items_source ON feed_items(feed_source_id);
      CREATE INDEX IF NOT EXISTS idx_feed_items_published ON feed_items(published_at);
      CREATE INDEX IF NOT EXISTS idx_feed_items_hash ON feed_items(content_hash);
    `,
  },
  // NOTE: version 6 is reserved by the AniList resolver migration
  // (resolve_cache / resolve_cache_meta) that lives on a separate branch and is
  // already applied to some local databases. Keep feed migrations at 7+ to avoid
  // a version collision that would silently skip this ALTER.
  {
    version: 7,
    description: 'Add content_html column to feed_items for full-article reading',
    up: `
      ALTER TABLE feed_items ADD COLUMN content_html TEXT;
    `,
  },
  {
    version: 8,
    description: 'Add supports_full_content flag to feed_sources (gates on-demand extraction)',
    up: `
      ALTER TABLE feed_sources ADD COLUMN supports_full_content INTEGER NOT NULL DEFAULT 1;
      -- On-demand Readability extraction is noisy or pointless for these sources
      -- (SPA pages, navigation/archive bleed, or episode-metadata feeds with no
      -- article body). Disable it so teaser items fall back to the clean CTA.
      UPDATE feed_sources SET supports_full_content = 0 WHERE name IN (
        'Anime News Network',
        'ANN Reviews',
        'MyAnimeList',
        'Anime Corner',
        'Crunchyroll',
        'LiveChart Episodes',
        'AnimeSchedule (Subs)'
      );
    `,
  },
  {
    version: 9,
    description: 'Clear previously-extracted noisy bodies for teaser-only sources',
    // These sources never ship a feed body (no content:encoded), so any stored
    // content_html came from an earlier on-demand extraction — which we now
    // disable because it bleeds navigation/archive lists into the reader. Null
    // those bodies so the items fall back to the clean teaser + CTA. Crunchyroll
    // is deliberately excluded: it DOES ship content:encoded (Phase 1).
    up: `
      UPDATE feed_items SET content_html = NULL
      WHERE feed_source_id IN (
        SELECT id FROM feed_sources WHERE name IN (
          'Anime News Network',
          'ANN Reviews',
          'MyAnimeList',
          'Anime Corner',
          'LiveChart Episodes',
          'AnimeSchedule (Subs)'
        )
      );
    `,
  },
  {
    version: 10,
    description: 'Index feed_items.url for article lookups and backfill',
    // FeedService queries feed_items by `url` on a user action (opening an
    // article): the stored-body lookup and the persist UPDATE in
    // getArticleContent. `url` is not UNIQUE (uniqueness is (feed_source_id,
    // guid)), so a plain index is the right shape.
    up: `
      CREATE INDEX IF NOT EXISTS idx_feed_items_url ON feed_items(url);
    `,
  },
  {
    version: 11,
    description: 'Composite index for library list ORDER BY (status, updated_at)',
    // getAllEntries() always sorts by `updated_at DESC` — both the unfiltered
    // list and the `WHERE status = ? ORDER BY updated_at DESC` variant. The
    // existing single-column status index can satisfy the WHERE but not the
    // sort, forcing a filesort on every library read. A composite
    // (status, updated_at) index covers both shapes.
    up: `
      CREATE INDEX IF NOT EXISTS idx_anime_library_status_updated
        ON anime_library(status, updated_at);
    `,
  },
];

/**
 * Run pending database migrations in order.
 *
 * Creates a `_migrations` table to track which versions have been applied.
 * Each pending migration runs inside a transaction so partial failures
 * roll back cleanly.
 */
export function runMigrations(db: Database.Database): void {
  // Ensure the migrations tracking table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY,
      description TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Determine current schema version
  const row = db.prepare('SELECT MAX(version) AS current_version FROM _migrations').get() as
    | { current_version: number | null }
    | undefined;
  const currentVersion = row?.current_version ?? 0;

  const pending = MIGRATIONS.filter(m => m.version > currentVersion);

  if (pending.length === 0) {
    logger.debug(`Database is up to date (version ${currentVersion})`);
    return;
  }

  logger.info(`Running ${pending.length} pending migration(s) from version ${currentVersion}`);

  for (const migration of pending) {
    const applyMigration = db.transaction(() => {
      db.exec(migration.up);
      db.prepare('INSERT INTO _migrations (version, description) VALUES (?, ?)').run(
        migration.version,
        migration.description
      );
    });

    try {
      applyMigration();
    } catch (error) {
      // Name the failing version explicitly — the transaction rolls back, but
      // without this the only trace is the generic onModuleInit/uncaught handler.
      logger.error(
        `Migration v${migration.version} (${migration.description}) failed; rolled back`,
        error
      );
      throw error;
    }
    logger.info(`Applied migration v${migration.version}: ${migration.description}`);
  }

  logger.info(
    `All migrations applied. Database now at version ${pending[pending.length - 1].version}`
  );
}
