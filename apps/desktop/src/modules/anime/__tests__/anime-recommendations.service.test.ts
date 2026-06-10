import { AnimeRecommendationsService } from '../anime-recommendations.service';
import type { AniListClient } from '../anilist-client';
import type { RecommendationsResponse, SaveRecommendationResponse } from '../types';

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

describe('AnimeRecommendationsService', () => {
  describe('getRecommendations (item C5 community browse)', () => {
    it('maps recommendation pairings and drops entries with deleted media', async () => {
      const client = makeClient();
      client.query.mockResolvedValue({
        Page: {
          recommendations: [
            {
              id: 1,
              rating: 100,
              userRating: 'RATE_UP',
              media: {
                id: 10,
                title: { romaji: 'Source', english: null as unknown as string },
                coverImage: { large: 'src.png' },
                format: 'TV',
                averageScore: 80,
              },
              mediaRecommendation: {
                id: 20,
                title: { romaji: 'Recommended' },
                coverImage: { medium: 'rec.png' },
                format: 'MOVIE',
                averageScore: 85,
              },
            },
            // Deleted source media — dropped.
            {
              id: 2,
              rating: 50,
              userRating: 'NO_RATING',
              media: null,
              mediaRecommendation: { id: 30, title: { romaji: 'Orphan' }, coverImage: {} },
            },
            null,
          ],
        },
      } as RecommendationsResponse);
      const service = new AnimeRecommendationsService(client as unknown as AniListClient);

      const recs = await service.getRecommendations();

      expect(client.query).toHaveBeenCalledWith(expect.any(String), {
        perPage: 30,
        mediaId: undefined,
      });
      expect(recs).toEqual([
        {
          id: 1,
          rating: 100,
          userRating: 'RATE_UP',
          media: {
            id: 10,
            title: { romaji: 'Source', english: undefined, native: undefined },
            coverImage: 'src.png',
            format: 'TV',
            averageScore: 80,
          },
          mediaRecommendation: {
            id: 20,
            title: { romaji: 'Recommended', english: undefined, native: undefined },
            coverImage: 'rec.png',
            format: 'MOVIE',
            averageScore: 85,
          },
        },
      ]);
    });

    it('seeds by mediaId and defaults missing rating/userRating', async () => {
      const client = makeClient();
      client.query.mockResolvedValue({
        Page: {
          recommendations: [
            {
              id: 3,
              rating: null,
              userRating: null,
              media: { id: 1, title: { romaji: 'A' }, coverImage: {} },
              mediaRecommendation: { id: 2, title: { romaji: 'B' }, coverImage: {} },
            },
          ],
        },
      } as RecommendationsResponse);
      const service = new AnimeRecommendationsService(client as unknown as AniListClient);

      const recs = await service.getRecommendations(99);

      expect(client.query).toHaveBeenCalledWith(expect.any(String), { perPage: 30, mediaId: 99 });
      expect(recs[0].rating).toBe(0);
      expect(recs[0].userRating).toBe('NO_RATING');
    });

    it('tolerates a null Page (empty list)', async () => {
      const client = makeClient();
      client.query.mockResolvedValue({ Page: null } as RecommendationsResponse);
      const service = new AnimeRecommendationsService(client as unknown as AniListClient);

      await expect(service.getRecommendations()).resolves.toEqual([]);
    });
  });

  describe('saveRecommendation (item C4 voting)', () => {
    it('returns null when not connected, without mutating', async () => {
      const client = makeClient({ hasToken: jest.fn().mockResolvedValue(false) });
      const service = new AnimeRecommendationsService(client as unknown as AniListClient);

      const result = await service.saveRecommendation({
        mediaId: 1,
        mediaRecommendationId: 2,
        rating: 'RATE_UP',
      });

      expect(result).toBeNull();
      expect(client.query).not.toHaveBeenCalled();
    });

    it('casts the vote and returns the resulting userRating when connected', async () => {
      const client = makeClient({ hasToken: jest.fn().mockResolvedValue(true) });
      client.query.mockResolvedValue({
        SaveRecommendation: { id: 5, rating: 10, userRating: 'RATE_DOWN' },
      } as SaveRecommendationResponse);
      const service = new AnimeRecommendationsService(client as unknown as AniListClient);

      const result = await service.saveRecommendation({
        mediaId: 1,
        mediaRecommendationId: 2,
        rating: 'RATE_DOWN',
      });

      expect(result).toBe('RATE_DOWN');
      expect(client.query).toHaveBeenCalledWith(expect.any(String), {
        mediaId: 1,
        mediaRecommendationId: 2,
        rating: 'RATE_DOWN',
      });
    });

    it('falls back to NO_RATING when the mutation returns a null payload', async () => {
      const client = makeClient({ hasToken: jest.fn().mockResolvedValue(true) });
      client.query.mockResolvedValue({ SaveRecommendation: null } as SaveRecommendationResponse);
      const service = new AnimeRecommendationsService(client as unknown as AniListClient);

      const result = await service.saveRecommendation({
        mediaId: 1,
        mediaRecommendationId: 2,
        rating: 'NO_RATING',
      });

      expect(result).toBe('NO_RATING');
    });
  });
});
