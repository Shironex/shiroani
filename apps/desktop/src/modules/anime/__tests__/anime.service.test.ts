import { AnimeService } from '../anime.service';
import type { AniListClient } from '../anilist-client';
import type { AniListMedia, AniListPageInfo, PaginatedMediaResponse } from '../types';

/** Minimal AniListClient mock covering the methods the service under test calls. */
function makeClient(
  overrides: Partial<jest.Mocked<AniListClient>> = {}
): jest.Mocked<
  Pick<AniListClient, 'query' | 'cachedQuery' | 'hasToken' | 'getViewer' | 'saveMediaListEntry'>
> {
  return {
    query: jest.fn(),
    cachedQuery: jest.fn(),
    hasToken: jest.fn().mockResolvedValue(false),
    getViewer: jest.fn(),
    saveMediaListEntry: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<
    Pick<AniListClient, 'query' | 'cachedQuery' | 'hasToken' | 'getViewer' | 'saveMediaListEntry'>
  >;
}

const EMPTY_PAGE: AniListPageInfo = {
  total: 0,
  currentPage: 1,
  lastPage: 1,
  hasNextPage: false,
};

/** A minimal browse media node; `mediaListEntry` drives onList derivation. */
function makeBrowseMedia(
  id: number,
  mediaListEntry: AniListMedia['mediaListEntry'] = null
): AniListMedia {
  return {
    id,
    title: { romaji: `Anime ${id}` },
    coverImage: { large: `cover-${id}.png` },
    status: 'FINISHED',
    genres: [],
    mediaListEntry,
  };
}

describe('AnimeService discover onList + write-through', () => {
  describe('browse onList (item C4 filter + badge)', () => {
    it('derives a flat onList flag from mediaListEntry when connected', async () => {
      const client = makeClient({ hasToken: jest.fn().mockResolvedValue(true) });
      client.cachedQuery.mockResolvedValue({
        Page: {
          pageInfo: EMPTY_PAGE,
          media: [makeBrowseMedia(1, { status: 'CURRENT' }), makeBrowseMedia(2, null)],
        },
      } as PaginatedMediaResponse);
      const service = new AnimeService(client as unknown as AniListClient);

      const result = await service.getTrending(1);

      expect(result.media[0].onList).toBe(true);
      expect(result.media[1].onList).toBe(false);
    });

    it('leaves onList undefined when not connected (no badge)', async () => {
      const client = makeClient({ hasToken: jest.fn().mockResolvedValue(false) });
      client.cachedQuery.mockResolvedValue({
        Page: { pageInfo: EMPTY_PAGE, media: [makeBrowseMedia(1, { status: 'CURRENT' })] },
      } as PaginatedMediaResponse);
      const service = new AnimeService(client as unknown as AniListClient);

      const result = await service.getTrending(1);

      expect(result.media[0].onList).toBeUndefined();
    });

    it('passes onList:false to AniList only when connected AND excludeOnList is set', async () => {
      const client = makeClient({ hasToken: jest.fn().mockResolvedValue(true) });
      client.cachedQuery.mockResolvedValue({
        Page: { pageInfo: EMPTY_PAGE, media: [] },
      } as PaginatedMediaResponse);
      const service = new AnimeService(client as unknown as AniListClient);

      await service.getTrending(1, undefined, undefined, { excludeOnList: true });

      const vars = client.cachedQuery.mock.calls[0][2] as Record<string, unknown>;
      expect(vars.onList).toBe(false);
    });

    it('does NOT pass the onList filter arg when unauthed (no-op)', async () => {
      const client = makeClient({ hasToken: jest.fn().mockResolvedValue(false) });
      client.cachedQuery.mockResolvedValue({
        Page: { pageInfo: EMPTY_PAGE, media: [] },
      } as PaginatedMediaResponse);
      const service = new AnimeService(client as unknown as AniListClient);

      await service.getTrending(1, undefined, undefined, { excludeOnList: true });

      const vars = client.cachedQuery.mock.calls[0][2] as Record<string, unknown>;
      expect(vars.onList).toBeUndefined();
    });

    it('folds the auth bit into the browse cache key', async () => {
      const client = makeClient({ hasToken: jest.fn().mockResolvedValue(true) });
      client.cachedQuery.mockResolvedValue({
        Page: { pageInfo: EMPTY_PAGE, media: [] },
      } as PaginatedMediaResponse);
      const service = new AnimeService(client as unknown as AniListClient);

      await service.getTrending(1);

      const cacheKey = client.cachedQuery.mock.calls[0][0] as string;
      expect(cacheKey).toBe('trending:1:auth');
    });
  });

  describe('saveMediaListEntry (item C3 write-through)', () => {
    it('returns null when not connected, without writing', async () => {
      const client = makeClient({ hasToken: jest.fn().mockResolvedValue(false) });
      const service = new AnimeService(client as unknown as AniListClient);

      const updatedAt = await service.saveMediaListEntry({ mediaId: 1 });

      expect(updatedAt).toBeNull();
      expect(client.saveMediaListEntry).not.toHaveBeenCalled();
    });

    it('defaults status to PLANNING and converts local 0-10 score to POINT_100', async () => {
      const client = makeClient({ hasToken: jest.fn().mockResolvedValue(true) });
      client.saveMediaListEntry.mockResolvedValue(1_700_000_000);
      const service = new AnimeService(client as unknown as AniListClient);

      const updatedAt = await service.saveMediaListEntry({ mediaId: 42, score: 8.5 });

      expect(updatedAt).toBe(1_700_000_000);
      expect(client.saveMediaListEntry).toHaveBeenCalledWith({
        mediaId: 42,
        status: 'PLANNING',
        progress: undefined,
        scoreRaw: 85,
        notes: undefined,
      });
    });

    it('honors an explicit status and omits scoreRaw when score is absent', async () => {
      const client = makeClient({ hasToken: jest.fn().mockResolvedValue(true) });
      client.saveMediaListEntry.mockResolvedValue(1_700_000_001);
      const service = new AnimeService(client as unknown as AniListClient);

      await service.saveMediaListEntry({ mediaId: 7, status: 'CURRENT', progress: 3 });

      expect(client.saveMediaListEntry).toHaveBeenCalledWith({
        mediaId: 7,
        status: 'CURRENT',
        progress: 3,
        scoreRaw: undefined,
        notes: undefined,
      });
    });
  });
});
