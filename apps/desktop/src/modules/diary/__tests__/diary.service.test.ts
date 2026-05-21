import { rowToEntry, type DiaryRow } from '../diary.types';

describe('rowToEntry', () => {
  it('maps a full row with all fields populated', () => {
    const row: DiaryRow = {
      id: 1,
      title: 'My Diary Entry',
      content_json: '{"blocks":[]}',
      cover_gradient: 'sakura',
      mood: 'great',
      tags: '["anime","fun"]',
      anime_id: 42,
      anime_title: 'Naruto',
      anime_cover_image: 'https://img.example.com/cover.jpg',
      is_pinned: 1,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-06-15T12:00:00Z',
    };

    const entry = rowToEntry(row);

    expect(entry.id).toBe(1);
    expect(entry.title).toBe('My Diary Entry');
    expect(entry.contentJson).toBe('{"blocks":[]}');
    expect(entry.coverGradient).toBe('sakura');
    expect(entry.mood).toBe('great');
    expect(entry.tags).toEqual(['anime', 'fun']);
    expect(entry.animeId).toBe(42);
    expect(entry.animeTitle).toBe('Naruto');
    expect(entry.animeCoverImage).toBe('https://img.example.com/cover.jpg');
    expect(entry.isPinned).toBe(true);
    expect(entry.createdAt).toBe('2024-01-01T00:00:00Z');
    expect(entry.updatedAt).toBe('2024-06-15T12:00:00Z');
  });

  it('converts null optional fields to undefined', () => {
    const row: DiaryRow = {
      id: 2,
      title: 'Minimal Entry',
      content_json: '{}',
      cover_gradient: null,
      mood: null,
      tags: null,
      anime_id: null,
      anime_title: null,
      anime_cover_image: null,
      is_pinned: 0,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    const entry = rowToEntry(row);

    expect(entry.coverGradient).toBeUndefined();
    expect(entry.mood).toBeUndefined();
    expect(entry.tags).toBeUndefined();
    expect(entry.animeId).toBeUndefined();
    expect(entry.animeTitle).toBeUndefined();
    expect(entry.animeCoverImage).toBeUndefined();
    expect(entry.isPinned).toBe(false);
  });

  it('parses tags JSON string into an array', () => {
    const row: DiaryRow = {
      id: 3,
      title: 'Tagged Entry',
      content_json: '{}',
      cover_gradient: null,
      mood: null,
      tags: '["tag1","tag2","tag3"]',
      anime_id: null,
      anime_title: null,
      anime_cover_image: null,
      is_pinned: 0,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    const entry = rowToEntry(row);

    expect(entry.tags).toEqual(['tag1', 'tag2', 'tag3']);
  });

  it('maps is_pinned = 0 to false and is_pinned = 1 to true', () => {
    const unpinnedRow: DiaryRow = {
      id: 4,
      title: 'Unpinned',
      content_json: '{}',
      cover_gradient: null,
      mood: null,
      tags: null,
      anime_id: null,
      anime_title: null,
      anime_cover_image: null,
      is_pinned: 0,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    const pinnedRow: DiaryRow = { ...unpinnedRow, id: 5, title: 'Pinned', is_pinned: 1 };

    expect(rowToEntry(unpinnedRow).isPinned).toBe(false);
    expect(rowToEntry(pinnedRow).isPinned).toBe(true);
  });

  it('preserves required fields regardless of optional values', () => {
    const row: DiaryRow = {
      id: 99,
      title: 'Required Fields',
      content_json: '{"type":"doc"}',
      cover_gradient: null,
      mood: null,
      tags: null,
      anime_id: null,
      anime_title: null,
      anime_cover_image: null,
      is_pinned: 0,
      created_at: '2024-03-15T08:00:00Z',
      updated_at: '2024-03-15T10:00:00Z',
    };

    const entry = rowToEntry(row);

    expect(entry.id).toBe(99);
    expect(entry.title).toBe('Required Fields');
    expect(entry.contentJson).toBe('{"type":"doc"}');
    expect(entry.createdAt).toBe('2024-03-15T08:00:00Z');
    expect(entry.updatedAt).toBe('2024-03-15T10:00:00Z');
  });
});
