import type Database from 'better-sqlite3';
import { getAll, buildUpdate } from '../sqlite-crud';

/** Minimal better-sqlite3 stub that records the SQL passed to prepare(). */
function makeDbStub(rows: unknown[] = []) {
  const prepared: string[] = [];
  const db = {
    prepare(sql: string) {
      prepared.push(sql);
      return {
        all: () => rows,
        get: () => rows[0],
        run: () => ({ changes: 0 }),
      };
    },
  } as unknown as Database.Database;
  return { db, prepared };
}

describe('getAll — ORDER BY handling', () => {
  const mapper = (row: { id: number }) => row;

  it('accepts a single-column order (library: updated_at DESC)', () => {
    const { db, prepared } = makeDbStub([{ id: 1 }]);
    expect(() => getAll(db, 'anime_library', mapper, 'updated_at DESC')).not.toThrow();
    expect(prepared[0]).toBe('SELECT * FROM anime_library ORDER BY updated_at DESC');
  });

  it('accepts a multi-column order (diary: is_pinned DESC, updated_at DESC)', () => {
    const { db, prepared } = makeDbStub([{ id: 1 }]);
    expect(() =>
      getAll(db, 'diary_entries', mapper, 'is_pinned DESC, updated_at DESC')
    ).not.toThrow();
    expect(prepared[0]).toBe(
      'SELECT * FROM diary_entries ORDER BY is_pinned DESC, updated_at DESC'
    );
  });

  it('accepts a bare column with no direction', () => {
    const { db } = makeDbStub();
    expect(() => getAll(db, 'diary_entries', mapper, 'created_at')).not.toThrow();
  });

  it('omits ORDER BY entirely when no order is given', () => {
    const { db, prepared } = makeDbStub();
    getAll(db, 'diary_entries', mapper);
    expect(prepared[0]).toBe('SELECT * FROM diary_entries');
  });

  it('rejects an injection attempt in the order clause', () => {
    const { db } = makeDbStub();
    expect(() =>
      getAll(db, 'diary_entries', mapper, 'updated_at; DROP TABLE diary_entries')
    ).toThrow(/Invalid SQL ORDER BY/);
  });

  it('rejects a non-identifier table name', () => {
    const { db } = makeDbStub();
    expect(() => getAll(db, 'diary_entries; DROP TABLE x', mapper)).toThrow(
      /Invalid SQL identifier/
    );
  });
});

describe('buildUpdate — identifier guarding', () => {
  it('rejects a malicious column name', () => {
    expect(() =>
      buildUpdate('diary_entries', { title: 'x' }, { title: { column: 'title = 1; --' } }, 1)
    ).toThrow(/Invalid SQL identifier/);
  });
});
