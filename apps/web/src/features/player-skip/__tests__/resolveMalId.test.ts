import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AnimeEntry } from '@shiroani/shared';
import { AnimeEvents } from '@shiroani/shared';

// Mock emitWithErrorHandling before importing resolveMalId
vi.mock('@/lib/socket', () => ({
  emitWithErrorHandling: vi.fn(),
}));

import { emitWithErrorHandling } from '@/lib/socket';
import { resolveMalId } from '../resolveMalId';

const mockEmit = emitWithErrorHandling as ReturnType<typeof vi.fn>;

function makeEntry(overrides: Partial<AnimeEntry> = {}): AnimeEntry {
  return {
    id: 1,
    title: 'Steins;Gate',
    titleRomaji: 'Steins;Gate',
    status: 'watching',
    currentEpisode: 0,
    addedAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

const STEINS_GATE_ANILIST_ID = 9253;
const STEINS_GATE_MAL_ID = 9253;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('resolveMalId', () => {
  describe('Tier 1 — library direct', () => {
    it('returns resolution when library entry has anilistId and AniList returns idMal', async () => {
      const entry = makeEntry({ anilistId: STEINS_GATE_ANILIST_ID });
      mockEmit.mockResolvedValueOnce({ anime: { idMal: STEINS_GATE_MAL_ID } });

      const result = await resolveMalId({
        animeTitle: 'Steins;Gate',
        libraryEntries: [entry],
      });

      expect(result).toEqual({
        malId: STEINS_GATE_MAL_ID,
        anilistId: STEINS_GATE_ANILIST_ID,
        source: 'library-direct',
        confidence: 1.0,
      });
      expect(mockEmit).toHaveBeenCalledWith(AnimeEvents.GET_DETAILS, {
        anilistId: STEINS_GATE_ANILIST_ID,
      });
    });

    it('matches on titleRomaji when title does not match', async () => {
      const entry = makeEntry({
        title: 'シュタインズ・ゲート',
        titleRomaji: 'Steins;Gate',
        anilistId: STEINS_GATE_ANILIST_ID,
      });
      mockEmit.mockResolvedValueOnce({ anime: { idMal: STEINS_GATE_MAL_ID } });

      const result = await resolveMalId({
        animeTitle: 'Steins;Gate',
        libraryEntries: [entry],
      });

      expect(result?.source).toBe('library-direct');
    });

    it('does NOT call AniList search on Tier 1 hit', async () => {
      const entry = makeEntry({ anilistId: STEINS_GATE_ANILIST_ID });
      mockEmit.mockResolvedValueOnce({ anime: { idMal: STEINS_GATE_MAL_ID } });

      await resolveMalId({ animeTitle: 'Steins;Gate', libraryEntries: [entry] });

      expect(mockEmit).toHaveBeenCalledTimes(1);
      expect(mockEmit).not.toHaveBeenCalledWith(AnimeEvents.SEARCH_BY_TITLE, expect.anything());
    });

    it('falls through to Tier 3 when AniList details returns no idMal', async () => {
      const entry = makeEntry({ anilistId: STEINS_GATE_ANILIST_ID });
      // Details call returns no idMal
      mockEmit.mockResolvedValueOnce({ anime: {} });
      // Tier 3 search call
      mockEmit.mockResolvedValueOnce({
        results: [
          {
            anilistId: STEINS_GATE_ANILIST_ID,
            idMal: STEINS_GATE_MAL_ID,
            title: { romaji: 'Steins Gate', english: 'Steins;Gate' },
          },
        ],
      });

      const result = await resolveMalId({
        animeTitle: 'Steins;Gate',
        libraryEntries: [entry],
      });

      // Falls to Tier 3 because Tier 1 AniList call didn't return idMal
      // (no library match without anilistId, so it's Tier 3)
      expect(result).not.toBeNull();
    });
  });

  describe('Tier 2 — library match without anilistId', () => {
    it('resolves and calls onAnilistIdResolved when similarity > 0.8', async () => {
      const entry = makeEntry({ anilistId: undefined });
      mockEmit.mockResolvedValueOnce({
        results: [
          {
            anilistId: STEINS_GATE_ANILIST_ID,
            idMal: STEINS_GATE_MAL_ID,
            title: { romaji: 'Steins Gate', english: null },
          },
        ],
      });

      const onResolved = vi.fn();
      const result = await resolveMalId({
        animeTitle: 'Steins;Gate',
        libraryEntries: [entry],
        onAnilistIdResolved: onResolved,
      });

      expect(result?.source).toBe('library-resolved');
      expect(result?.malId).toBe(STEINS_GATE_MAL_ID);
      expect(onResolved).toHaveBeenCalledWith(entry.id, STEINS_GATE_ANILIST_ID);
    });

    it('returns null and does not call onAnilistIdResolved when similarity <= 0.8', async () => {
      const entry = makeEntry({ title: 'Steins;Gate', anilistId: undefined });
      // Completely different title returned
      mockEmit.mockResolvedValueOnce({
        results: [
          {
            anilistId: 999,
            idMal: 999,
            title: { romaji: 'Dragon Ball Z', english: 'Dragon Ball Z' },
          },
        ],
      });

      const onResolved = vi.fn();
      const result = await resolveMalId({
        animeTitle: 'Steins;Gate',
        libraryEntries: [entry],
        onAnilistIdResolved: onResolved,
      });

      expect(result).toBeNull();
      expect(onResolved).not.toHaveBeenCalled();
    });

    it('returns null and does not persist when best result has no idMal', async () => {
      const entry = makeEntry({ anilistId: undefined });
      mockEmit.mockResolvedValueOnce({
        results: [
          {
            anilistId: STEINS_GATE_ANILIST_ID,
            idMal: undefined,
            title: { romaji: 'Steins Gate' },
          },
        ],
      });

      const onResolved = vi.fn();
      const result = await resolveMalId({
        animeTitle: 'Steins;Gate',
        libraryEntries: [entry],
        onAnilistIdResolved: onResolved,
      });

      expect(result).toBeNull();
      expect(onResolved).not.toHaveBeenCalled();
    });
  });

  describe('Tier 3 — not in library', () => {
    it('resolves but does NOT call onAnilistIdResolved', async () => {
      mockEmit.mockResolvedValueOnce({
        results: [
          {
            anilistId: STEINS_GATE_ANILIST_ID,
            idMal: STEINS_GATE_MAL_ID,
            title: { romaji: 'Steins Gate' },
          },
        ],
      });

      const onResolved = vi.fn();
      const result = await resolveMalId({
        animeTitle: 'Steins;Gate',
        libraryEntries: [],
        onAnilistIdResolved: onResolved,
      });

      expect(result?.source).toBe('anilist-search');
      expect(result?.malId).toBe(STEINS_GATE_MAL_ID);
      expect(onResolved).not.toHaveBeenCalled();
    });

    it('returns null when no results pass threshold', async () => {
      mockEmit.mockResolvedValueOnce({
        results: [{ anilistId: 1, idMal: 1, title: { romaji: 'Completely Different Show' } }],
      });

      const result = await resolveMalId({
        animeTitle: 'Steins;Gate',
        libraryEntries: [],
      });

      expect(result).toBeNull();
    });

    it('returns null on AniList search failure', async () => {
      mockEmit.mockRejectedValueOnce(new Error('Network error'));

      const result = await resolveMalId({
        animeTitle: 'Steins;Gate',
        libraryEntries: [],
      });

      expect(result).toBeNull();
    });
  });

  describe('concurrent deduplication', () => {
    it('shares one promise for concurrent calls with the same title', async () => {
      mockEmit.mockResolvedValueOnce({
        results: [
          {
            anilistId: STEINS_GATE_ANILIST_ID,
            idMal: STEINS_GATE_MAL_ID,
            title: { romaji: 'Steins Gate' },
          },
        ],
      });

      const [r1, r2] = await Promise.all([
        resolveMalId({ animeTitle: 'Steins;Gate', libraryEntries: [] }),
        resolveMalId({ animeTitle: 'Steins;Gate', libraryEntries: [] }),
      ]);

      expect(r1).toEqual(r2);
      expect(mockEmit).toHaveBeenCalledTimes(1);
    });
  });
});
