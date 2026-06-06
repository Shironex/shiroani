/**
 * Guards the AniList-sync surface of LibraryService against a fake better-sqlite3
 * `db`. The critical invariant: `markAniListSync` must NOT bump `updated_at`
 * (doing so would make the next sync misread a just-reconciled row as a fresh
 * local edit — the ping-pong the baselines exist to prevent).
 */

import { LibraryService } from '../library.service';
import type { AnimeLibraryRow } from '../library.types';

interface FakeStmt {
  sql: string;
  run: jest.Mock;
  get: jest.Mock;
  all: jest.Mock;
}

const SAMPLE_ROW: AnimeLibraryRow = {
  id: 1,
  anilist_id: 100,
  title: 'Test',
  title_romaji: null,
  title_native: null,
  cover_image: null,
  total_episodes: null,
  status: 'watching',
  current_episode: 0,
  score: null,
  notes: null,
  resume_url: null,
  added_at: '2024-01-01 00:00:00',
  updated_at: '2024-01-01 00:00:00',
  anilist_synced_at: null,
  anilist_remote_updated_at: null,
};

function makeService() {
  const prepared: FakeStmt[] = [];
  const db = {
    prepare: jest.fn((sql: string): FakeStmt => {
      const stmt: FakeStmt = {
        sql,
        run: jest.fn().mockReturnValue({ lastInsertRowid: 1, changes: 1 }),
        get: jest.fn().mockReturnValue(SAMPLE_ROW),
        all: jest.fn().mockReturnValue([]),
      };
      prepared.push(stmt);
      return stmt;
    }),
  };
  const service = new LibraryService({ db } as never);
  return { service, prepared };
}

describe('LibraryService.markAniListSync', () => {
  it('updates ONLY the sync baselines and never bumps updated_at', () => {
    const { service, prepared } = makeService();
    service.markAniListSync(42, 1_700_000_000);

    const stmt = prepared.find(s => s.sql.includes('anilist_synced_at'));
    expect(stmt).toBeDefined();
    // The bare `updated_at` column must not be assigned. `[\s,]updated_at`
    // matches a real bump (`SET updated_at`, `, updated_at`) but not the
    // `anilist_remote_updated_at` column (preceded by `_`).
    expect(stmt!.sql).not.toMatch(/[\s,]updated_at\b/);
    expect(stmt!.sql).toMatch(/anilist_remote_updated_at\s*=\s*\?/);
    expect(stmt!.run).toHaveBeenCalledWith(1_700_000_000, 42);
  });
});

describe('LibraryService.addEntry', () => {
  it('persists score and notes on insert (so AniList imports keep them)', () => {
    const { service, prepared } = makeService();
    service.addEntry({
      anilistId: 100,
      title: 'Imported',
      status: 'completed',
      currentEpisode: 12,
      score: 8.5,
      notes: 'great',
    });

    const insert = prepared.find(s => /INSERT INTO anime_library/i.test(s.sql));
    expect(insert).toBeDefined();
    expect(insert!.sql).toMatch(/score/);
    expect(insert!.sql).toMatch(/notes/);
    const args = insert!.run.mock.calls[0] as unknown[];
    expect(args).toContain(8.5);
    expect(args).toContain('great');
  });
});
