import type Database from 'better-sqlite3';
import { DatabaseService } from '../database.service';

/**
 * Recording better-sqlite3 stub (mirrors the approach in sqlite-crud.test.ts —
 * the native module isn't loaded under jest). It answers the two read queries
 * `clearAllData` issues (table enumeration via `.all()`, sequence existence via
 * `.get()`) and records every `DELETE`/`VACUUM` so the test can assert the wipe
 * composition and control flow.
 */
function makeWipeDbStub(tableNames: string[], hasSequence = true) {
  const prepared: string[] = [];
  const runs: string[] = [];
  const execs: string[] = [];

  const db = {
    prepare(sql: string) {
      const trimmed = sql.replace(/\s+/g, ' ').trim();
      prepared.push(trimmed);
      return {
        all: () =>
          trimmed.startsWith('SELECT name FROM sqlite_master')
            ? tableNames.map(name => ({ name }))
            : [],
        get: () =>
          trimmed.includes("name = 'sqlite_sequence'")
            ? hasSequence
              ? { 1: 1 }
              : undefined
            : undefined,
        run: () => {
          runs.push(trimmed);
          return { changes: 0 };
        },
      };
    },
    transaction(fn: () => void) {
      // better-sqlite3 returns a callable that runs fn in a transaction.
      return () => fn();
    },
    exec(sql: string) {
      execs.push(sql.replace(/\s+/g, ' ').trim());
    },
  } as unknown as Database.Database;

  return { db, prepared, runs, execs };
}

function buildService(tableNames: string[], hasSequence = true) {
  const stub = makeWipeDbStub(tableNames, hasSequence);
  const service = new DatabaseService(':memory:');
  // Inject the stub in place of the real better-sqlite3 handle normally opened
  // in onModuleInit (which we skip — no native module under jest).
  (service as unknown as { _db: Database.Database })._db = stub.db;
  return { service, ...stub };
}

describe('DatabaseService.clearAllData', () => {
  it('deletes from every user table returned by sqlite_master', () => {
    const { service, runs } = buildService(['anime_library', 'diary_entries', 'feed_items']);
    service.clearAllData();
    expect(runs).toContain('DELETE FROM "anime_library"');
    expect(runs).toContain('DELETE FROM "diary_entries"');
    expect(runs).toContain('DELETE FROM "feed_items"');
  });

  it('enumerates tables excluding _migrations and sqlite_% internals', () => {
    const { service, prepared } = buildService(['anime_library']);
    service.clearAllData();
    const masterQuery = prepared.find(s => s.startsWith('SELECT name FROM sqlite_master'));
    expect(masterQuery).toBeDefined();
    expect(masterQuery).toContain("name != '_migrations'");
    expect(masterQuery).toContain("name NOT LIKE 'sqlite_%'");
  });

  it('resets AUTOINCREMENT by clearing sqlite_sequence when it exists', () => {
    const { service, runs } = buildService(['anime_library'], true);
    service.clearAllData();
    expect(runs).toContain('DELETE FROM sqlite_sequence');
  });

  it('skips sqlite_sequence when the table does not exist', () => {
    const { service, runs } = buildService(['anime_library'], false);
    service.clearAllData();
    expect(runs).not.toContain('DELETE FROM sqlite_sequence');
  });

  it('VACUUMs after the wipe to reclaim disk space', () => {
    const { service, execs } = buildService(['anime_library']);
    service.clearAllData();
    expect(execs).toContain('VACUUM');
  });

  it('does not throw when VACUUM fails (the data is already cleared)', () => {
    const { service, db } = buildService(['anime_library']);
    (db as unknown as { exec: () => void }).exec = () => {
      throw new Error('vacuum failed');
    };
    expect(() => service.clearAllData()).not.toThrow();
  });

  it('is a no-op-safe wipe when there are no user tables', () => {
    const { service, runs, execs } = buildService([], false);
    expect(() => service.clearAllData()).not.toThrow();
    expect(runs).toEqual([]);
    expect(execs).toContain('VACUUM');
  });
});
