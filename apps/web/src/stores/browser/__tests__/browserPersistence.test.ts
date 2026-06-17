import { describe, it, expect } from 'vitest';
import { BROWSER_FAVORITES_MAX_ENTRIES, migratePersistedFavorites } from '../browserPersistence';

describe('migratePersistedFavorites', () => {
  it('returns an empty array for non-array input', () => {
    expect(migratePersistedFavorites(null)).toEqual([]);
    expect(migratePersistedFavorites(undefined)).toEqual([]);
    expect(migratePersistedFavorites({})).toEqual([]);
    expect(migratePersistedFavorites('nope')).toEqual([]);
  });

  it('keeps valid entries and preserves their order', () => {
    const out = migratePersistedFavorites([
      { id: '1', url: 'https://a.com', title: 'A', favicon: 'https://a.com/f.ico', createdAt: 10 },
      { id: '2', url: 'https://b.com', title: 'B', createdAt: 20 },
    ]);
    expect(out).toHaveLength(2);
    expect(out.map(f => f.url)).toEqual(['https://a.com', 'https://b.com']);
    expect(out[0].favicon).toBe('https://a.com/f.ico');
    expect(out[1].favicon).toBeUndefined();
  });

  it('drops entries with a missing or empty url', () => {
    const out = migratePersistedFavorites([
      { id: '1', url: '', title: 'empty' },
      null,
      { id: '2', title: 'no url' },
      { id: '3', url: 'https://ok.com', title: 'ok' },
    ]);
    expect(out.map(f => f.url)).toEqual(['https://ok.com']);
  });

  it('drops duplicate URLs, keeping the first', () => {
    const out = migratePersistedFavorites([
      { id: '1', url: 'https://a.com', title: 'first' },
      { id: '2', url: 'https://a.com', title: 'dupe' },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].title).toBe('first');
  });

  it('backfills a missing id and createdAt defensively', () => {
    const out = migratePersistedFavorites([{ url: 'https://a.com', title: 'A' }]);
    expect(out).toHaveLength(1);
    expect(typeof out[0].id).toBe('string');
    expect(out[0].id.length).toBeGreaterThan(0);
    expect(typeof out[0].createdAt).toBe('number');
    expect(Number.isFinite(out[0].createdAt)).toBe(true);
  });

  it('coerces a non-string title to an empty string', () => {
    const out = migratePersistedFavorites([{ url: 'https://a.com', title: 123 }]);
    expect(out[0].title).toBe('');
  });

  it('caps the result at BROWSER_FAVORITES_MAX_ENTRIES', () => {
    const raw = Array.from({ length: BROWSER_FAVORITES_MAX_ENTRIES + 25 }, (_, i) => ({
      id: `id-${i}`,
      url: `https://site-${i}.com`,
      title: `Site ${i}`,
    }));
    const out = migratePersistedFavorites(raw);
    expect(out).toHaveLength(BROWSER_FAVORITES_MAX_ENTRIES);
  });
});
