import { DatabaseSync } from 'node:sqlite';
import type Database from 'better-sqlite3';
import { MIGRATIONS, runMigrations } from '../migrations';

/**
 * Migration-application test for the v14 MAL bridge.
 *
 * The real native better-sqlite3 module cannot load under jest here (it is built
 * against Electron's Node ABI, not the system Node — `NODE_MODULE_VERSION`
 * mismatch), which is why every other DB test in this repo stubs it. A schema
 * migration, though, MUST run against a real SQLite engine: only that catches a
 * broken ALTER / index / NULL-uniqueness assumption (typecheck never will). So
 * this test uses Node's built-in `node:sqlite` (`DatabaseSync`) — the SAME
 * SQLite core, with identical ALTER / UNIQUE-index / NULL-distinctness
 * semantics — wrapped in a thin better-sqlite3-shaped adapter so the production
 * `runMigrations` runs unchanged against it.
 */

/**
 * Adapt a `node:sqlite` `DatabaseSync` to the small slice of the better-sqlite3
 * surface `runMigrations` uses: `exec`, `prepare().get()/.run()`, and a
 * `transaction()` that returns a callable wrapping the body in BEGIN/COMMIT and
 * ROLLBACK-on-throw (better-sqlite3's `db.transaction(fn)` contract).
 */
function adapt(raw: DatabaseSync): Database.Database {
  return {
    exec(sql: string) {
      raw.exec(sql);
    },
    prepare(sql: string) {
      const stmt = raw.prepare(sql);
      return {
        get: (...args: unknown[]) => stmt.get(...(args as never[])),
        run: (...args: unknown[]) => stmt.run(...(args as never[])),
        all: (...args: unknown[]) => stmt.all(...(args as never[])),
      };
    },
    transaction(fn: (...a: unknown[]) => unknown) {
      return (...a: unknown[]) => {
        raw.exec('BEGIN');
        try {
          const out = fn(...a);
          raw.exec('COMMIT');
          return out;
        } catch (err) {
          raw.exec('ROLLBACK');
          throw err;
        }
      };
    },
  } as unknown as Database.Database;
}

/** All migrations strictly before v14 — the pre-v14 schema. */
const PRE_V14 = MIGRATIONS.filter(m => m.version < 14);

describe('migrations — v14 MAL bridge', () => {
  function freshDb() {
    const raw = new DatabaseSync(':memory:');
    return { raw, db: adapt(raw) };
  }

  it('applies all migrations (v14 included) without throwing', () => {
    const { db } = freshDb();
    expect(() => runMigrations(db)).not.toThrow();

    const versions = (
      db.prepare('SELECT version FROM _migrations ORDER BY version').all() as {
        version: number;
      }[]
    ).map(r => r.version);
    expect(versions).toContain(14);
  });

  it('adds mal_id as NULL on rows that existed before v14', () => {
    const { raw, db } = freshDb();

    // Reach the pre-v14 schema, then seed rows that predate the MAL columns.
    runMigrations(db, PRE_V14);
    raw
      .prepare('INSERT INTO anime_library (anilist_id, title) VALUES (?, ?)')
      .run(100, 'Pre-v14 A');
    raw
      .prepare('INSERT INTO anime_library (anilist_id, title) VALUES (?, ?)')
      .run(200, 'Pre-v14 B');

    // Now apply the full set — only v14 is pending — onto the existing rows.
    expect(() => runMigrations(db)).not.toThrow();

    // Select EVERY v14-added column: a typo'd column name (still valid SQL that
    // applies cleanly, so test 1 wouldn't catch it) makes this throw
    // "no such column" — the regression that would otherwise surface only at
    // MAL runtime.
    const rows = raw
      .prepare(
        'SELECT title, mal_id, mal_synced_at, mal_remote_updated_at FROM anime_library ORDER BY title'
      )
      .all() as {
      title: string;
      mal_id: number | null;
      mal_synced_at: string | null;
      mal_remote_updated_at: number | null;
    }[];
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(row.mal_id).toBeNull();
      expect(row.mal_synced_at).toBeNull();
      expect(row.mal_remote_updated_at).toBeNull();
    }
  });

  it('creates a UNIQUE index that rejects a duplicate non-null mal_id', () => {
    const { raw, db } = freshDb();
    runMigrations(db);

    // The unique index must exist by name.
    const idx = raw
      .prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND name = ?")
      .get('idx_anime_library_mal_id') as { name: string } | undefined;
    expect(idx?.name).toBe('idx_anime_library_mal_id');

    raw.prepare('INSERT INTO anime_library (title, mal_id) VALUES (?, ?)').run('First', 555);
    expect(() =>
      raw.prepare('INSERT INTO anime_library (title, mal_id) VALUES (?, ?)').run('Dup', 555)
    ).toThrow(/UNIQUE/i);
  });

  it('lets two NULL mal_id rows coexist (SQLite treats NULLs as distinct)', () => {
    const { raw, db } = freshDb();
    runMigrations(db);

    raw.prepare('INSERT INTO anime_library (title, mal_id) VALUES (?, ?)').run('Null one', null);
    expect(() =>
      raw.prepare('INSERT INTO anime_library (title, mal_id) VALUES (?, ?)').run('Null two', null)
    ).not.toThrow();

    const count = raw
      .prepare('SELECT COUNT(*) AS c FROM anime_library WHERE mal_id IS NULL')
      .get() as { c: number };
    expect(count.c).toBe(2);
  });
});
