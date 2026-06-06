/**
 * Test the pure rowToEntry function from library.types.ts
 *
 * This imports rowToEntry and AnimeLibraryRow directly from the types module
 * to test the mapping contract between database rows and AnimeEntry objects.
 * This ensures the mapping stays correct if the DB schema changes.
 */

import { rowToEntry, type AnimeLibraryRow } from '../library.types';

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
