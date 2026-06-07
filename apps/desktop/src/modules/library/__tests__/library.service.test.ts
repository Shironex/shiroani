/**
 * Test the pure rowToEntry function from library.types.ts
 *
 * This imports rowToEntry and AnimeLibraryRow directly from the types module
 * to test the mapping contract between database rows and AnimeEntry objects.
 * This ensures the mapping stays correct if the DB schema changes.
 */

import { rowToEntry, type AnimeLibraryRow } from '../library.types';
import { LibraryService } from '../library.service';

describe('rowToEntry', () => {
  it('maps a full row with all fields populated', () => {
    const row: AnimeLibraryRow = {
      id: 42,
      anilist_id: 12345,
      title: 'Attack on Titan',
      title_romaji: 'Shingeki no Kyojin',
      title_native: '進撃の巨人',
      cover_image: 'https://img.example.com/cover.jpg',
      total_episodes: 75,
      status: 'completed',
      current_episode: 75,
      score: 9,
      notes: 'Amazing series',
      resume_url: 'https://example.com/watch',
      added_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-06-15T12:00:00Z',
      anilist_synced_at: null,
      anilist_remote_updated_at: null,
      mal_id: null,
      mal_synced_at: null,
      mal_remote_updated_at: null,
    };

    const entry = rowToEntry(row);

    expect(entry.id).toBe(42);
    expect(entry.anilistId).toBe(12345);
    expect(entry.title).toBe('Attack on Titan');
    expect(entry.titleRomaji).toBe('Shingeki no Kyojin');
    expect(entry.titleNative).toBe('進撃の巨人');
    expect(entry.coverImage).toBe('https://img.example.com/cover.jpg');
    expect(entry.episodes).toBe(75);
    expect(entry.status).toBe('completed');
    expect(entry.currentEpisode).toBe(75);
    expect(entry.score).toBe(9);
    expect(entry.notes).toBe('Amazing series');
    expect(entry.resumeUrl).toBe('https://example.com/watch');
    expect(entry.addedAt).toBe('2024-01-01T00:00:00Z');
    expect(entry.updatedAt).toBe('2024-06-15T12:00:00Z');
  });

  it('converts null optional fields to undefined', () => {
    const row: AnimeLibraryRow = {
      id: 1,
      anilist_id: null,
      title: 'Test Anime',
      title_romaji: null,
      title_native: null,
      cover_image: null,
      total_episodes: null,
      status: 'plan_to_watch',
      current_episode: 0,
      score: null,
      notes: null,
      resume_url: null,
      added_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      anilist_synced_at: null,
      anilist_remote_updated_at: null,
      mal_id: null,
      mal_synced_at: null,
      mal_remote_updated_at: null,
    };

    const entry = rowToEntry(row);

    expect(entry.anilistId).toBeUndefined();
    expect(entry.titleRomaji).toBeUndefined();
    expect(entry.titleNative).toBeUndefined();
    expect(entry.coverImage).toBeUndefined();
    expect(entry.episodes).toBeUndefined();
    expect(entry.score).toBeUndefined();
    expect(entry.notes).toBeUndefined();
    expect(entry.resumeUrl).toBeUndefined();
  });

  it('preserves required fields regardless of optional values', () => {
    const row: AnimeLibraryRow = {
      id: 99,
      anilist_id: null,
      title: 'Minimal Entry',
      title_romaji: null,
      title_native: null,
      cover_image: null,
      total_episodes: null,
      status: 'watching',
      current_episode: 5,
      score: null,
      notes: null,
      resume_url: null,
      added_at: '2024-03-15T08:00:00Z',
      updated_at: '2024-03-15T10:00:00Z',
      anilist_synced_at: null,
      anilist_remote_updated_at: null,
      mal_id: null,
      mal_synced_at: null,
      mal_remote_updated_at: null,
    };

    const entry = rowToEntry(row);

    expect(entry.id).toBe(99);
    expect(entry.title).toBe('Minimal Entry');
    expect(entry.status).toBe('watching');
    expect(entry.currentEpisode).toBe(5);
    expect(entry.addedAt).toBe('2024-03-15T08:00:00Z');
    expect(entry.updatedAt).toBe('2024-03-15T10:00:00Z');
  });
});

// ---------------------------------------------------------------------------
// Bulk mutations — removeMany / updateMany
//
// These replace the N individual REMOVE/UPDATE emits the batch action bar used
// to fire (which tripped the WS throttler). The invariants under test: each
// runs inside ONE transaction, removeMany reports only the rows that existed,
// and updateMany builds its UPDATE once and reuses it per id.
// ---------------------------------------------------------------------------

function makeRow(id: number, overrides: Partial<AnimeLibraryRow> = {}): AnimeLibraryRow {
  return {
    id,
    anilist_id: null,
    title: `Anime ${id}`,
    title_romaji: null,
    title_native: null,
    cover_image: null,
    total_episodes: null,
    status: 'watching',
    current_episode: 0,
    score: null,
    notes: null,
    resume_url: null,
    added_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    anilist_synced_at: null,
    anilist_remote_updated_at: null,
    mal_id: null,
    mal_synced_at: null,
    mal_remote_updated_at: null,
    ...overrides,
  };
}

interface PreparedStmt {
  sql: string;
  runArgs: unknown[][];
}

/**
 * Build a LibraryService over a faithful better-sqlite3 fake: `prepare()`
 * records SQL + run args, DELETE reports `changes` based on which ids exist,
 * SELECT-by-id returns a row for existing ids, and `transaction(fn)` is the
 * synchronous passthrough better-sqlite3 uses on the happy path.
 */
function makeBulkService(existingIds: number[]) {
  const existing = new Set(existingIds);
  const prepared: PreparedStmt[] = [];
  const db = {
    prepare: jest.fn((sql: string) => {
      const record: PreparedStmt = { sql, runArgs: [] };
      prepared.push(record);
      return {
        run: jest.fn((...args: unknown[]) => {
          record.runArgs.push(args);
          if (sql.trimStart().startsWith('DELETE')) {
            const id = args[args.length - 1] as number;
            const changes = existing.has(id) ? 1 : 0;
            existing.delete(id);
            return { changes };
          }
          return { changes: 1 };
        }),
        get: jest.fn((id: number) => (existing.has(id) ? makeRow(id) : undefined)),
        all: jest.fn(() => []),
      };
    }),
    transaction: jest.fn(
      <T>(fn: (arg: number[]) => T) =>
        (arg: number[]) =>
          fn(arg)
    ),
  };
  const service = new LibraryService({ db } as never);
  return { service, db, prepared };
}

describe('LibraryService.removeMany', () => {
  it('deletes in one transaction and returns only the ids that existed', () => {
    const { service, db, prepared } = makeBulkService([1, 2, 3]);

    const deleted = service.removeMany([1, 2, 3, 99]);

    expect(deleted).toEqual([1, 2, 3]); // 99 never existed
    expect(db.transaction).toHaveBeenCalledTimes(1);

    // The DELETE is prepared ONCE and reused for every id.
    const deletes = prepared.filter(p => p.sql.trimStart().startsWith('DELETE'));
    expect(deletes).toHaveLength(1);
    expect(deletes[0].runArgs).toHaveLength(4);
  });

  it('returns an empty list when no row existed (so the gateway skips the broadcast)', () => {
    const { service } = makeBulkService([]);
    expect(service.removeMany([5, 6])).toEqual([]);
  });
});

describe('LibraryService.updateMany', () => {
  it('builds the UPDATE once, reuses it per id, and returns the updated entries', () => {
    const { service, db, prepared } = makeBulkService([1, 2]);

    const updated = service.updateMany([1, 2], { status: 'completed' });

    expect(updated.map(e => e.id)).toEqual([1, 2]);
    expect(db.transaction).toHaveBeenCalledTimes(1);

    const updates = prepared.filter(p => p.sql.trimStart().startsWith('UPDATE'));
    expect(updates).toHaveLength(1); // built once, not per id
    expect(updates[0].sql).toContain('status = ?');
    expect(updates[0].sql).toContain("updated_at = datetime('now')");
    // One run per id, each binding the SET value then the id.
    expect(updates[0].runArgs).toEqual([
      ['completed', 1],
      ['completed', 2],
    ]);
  });

  it('is a no-op returning [] when no updatable field is supplied', () => {
    const { service, prepared } = makeBulkService([1]);

    expect(service.updateMany([1], {})).toEqual([]);
    // buildUpdate returned null → nothing was prepared or run.
    expect(prepared).toHaveLength(0);
  });
});
