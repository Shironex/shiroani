import { AnimeService } from '../anime.service';
import type { AniListClient } from '../anilist-client';
import type { MalClient } from '../mal-client';
import type {
  AniListUserProfile,
  AniListActivityNode,
  AniListNotificationNode,
  AniListMedia,
  AniListPageInfo,
  UserProfileResponse,
  ViewerProfileResponse,
  ViewerActivityResponse,
  SocialFeedResponse,
  FollowingResponse,
  FollowersResponse,
  ToggleFollowResponse,
  NotificationsResponse,
  RecommendationsResponse,
  SaveRecommendationResponse,
  PaginatedMediaResponse,
} from '../types';

/** A fully-populated raw AniList user/viewer object covering every mapped field. */
function makeRawProfile(overrides: Partial<AniListUserProfile> = {}): AniListUserProfile {
  return {
    id: 7,
    name: 'Anya',
    avatar: { large: 'avatar-large.png', medium: 'avatar-medium.png' },
    bannerImage: 'banner.png',
    about: 'Spy x Family',
    siteUrl: 'https://anilist.co/user/Anya',
    createdAt: 1_600_000_000,
    statistics: {
      anime: {
        count: 120,
        meanScore: 78.5,
        standardDeviation: 12.3,
        minutesWatched: 50_000,
        episodesWatched: 2400,
        genres: [{ genre: 'Action', count: 50, meanScore: 80, minutesWatched: 20_000 }],
        formats: [{ format: 'TV', count: 90, meanScore: 79, minutesWatched: 40_000 }],
        statuses: [{ status: 'COMPLETED', count: 100, meanScore: 80, minutesWatched: 45_000 }],
        scores: [{ score: 80, count: 30, meanScore: 80 }],
        releaseYears: [{ releaseYear: 2022, count: 20, meanScore: 82 }],
        studios: [{ studio: { name: 'WIT' }, count: 10, meanScore: 85, minutesWatched: 5_000 }],
        tags: [{ tag: { name: 'Shounen' }, count: 40, meanScore: 81 }],
        voiceActors: [
          {
            voiceActor: {
              id: 901,
              name: { full: 'Atsumi Tanezaki', userPreferred: 'Tanezaki' },
              image: { large: 'va-large.png', medium: 'va-medium.png' },
            },
            count: 8,
            meanScore: 83,
            minutesWatched: 3_000,
          },
        ],
        staff: [
          {
            staff: {
              id: 902,
              name: { full: 'Kazuhiro Furuhashi' },
              image: { medium: 'staff-medium.png' },
            },
            count: 5,
            meanScore: 84,
            minutesWatched: 2_000,
          },
        ],
        startYears: [{ startYear: 2023, count: 12, meanScore: 79, minutesWatched: 4_000 }],
        lengths: [{ length: '13', count: 30, meanScore: 80, minutesWatched: 6_000 }],
        countries: [{ country: 'JP', count: 110, meanScore: 78, minutesWatched: 48_000 }],
      },
    },
    favourites: {
      anime: {
        nodes: [
          {
            id: 1,
            title: { romaji: 'Spy x Family', english: 'Spy x Family', native: 'スパイファミリー' },
            coverImage: { large: 'anime-large.png', medium: 'anime-medium.png' },
          },
        ],
      },
      manga: {
        nodes: [
          {
            id: 2,
            title: { romaji: 'Chainsaw Man', native: 'チェンソーマン' },
            coverImage: { medium: 'manga-medium.png' },
          },
        ],
      },
      characters: {
        nodes: [
          {
            id: 3,
            name: { full: 'Anya Forger', userPreferred: 'Anya' },
            image: { large: 'char-large.png' },
          },
        ],
      },
      staff: {
        nodes: [{ id: 4, name: { userPreferred: 'Tatsuya Endo' }, image: { medium: 'staff.png' } }],
      },
      studios: {
        nodes: [{ id: 5, name: 'CloverWorks' }],
      },
    },
    ...overrides,
  };
}

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

describe('AnimeService profile + activity mappers', () => {
  describe('getUserProfile (public username path)', () => {
    it('maps the full statistics arrays and all-type favourites', async () => {
      const client = makeClient();
      client.cachedQuery.mockResolvedValue({ User: makeRawProfile() } as UserProfileResponse);
      const service = new AnimeService(client as unknown as AniListClient);

      const profile = await service.getUserProfile('Anya');

      // Existing fields still mapped.
      expect(profile.id).toBe(7);
      expect(profile.name).toBe('Anya');
      expect(profile.avatar).toBe('avatar-large.png');
      expect(profile.statistics.genres[0]).toEqual({
        name: 'Action',
        count: 50,
        meanScore: 80,
        minutesWatched: 20_000,
      });
      expect(profile.favourites[0]).toEqual({
        id: 1,
        title: { romaji: 'Spy x Family', english: 'Spy x Family', native: 'スパイファミリー' },
        coverImage: 'anime-large.png',
      });

      // New statistics arrays.
      expect(profile.statistics.voiceActors).toEqual([
        { name: 'Atsumi Tanezaki', count: 8, meanScore: 83, minutesWatched: 3_000 },
      ]);
      expect(profile.statistics.staff).toEqual([
        { name: 'Kazuhiro Furuhashi', count: 5, meanScore: 84, minutesWatched: 2_000 },
      ]);
      expect(profile.statistics.startYears).toEqual([
        { value: 2023, count: 12, meanScore: 79, minutesWatched: 4_000 },
      ]);
      expect(profile.statistics.lengths).toEqual([
        { value: '13', count: 30, meanScore: 80, minutesWatched: 6_000 },
      ]);
      expect(profile.statistics.countries).toEqual([
        { value: 'JP', count: 110, meanScore: 78, minutesWatched: 48_000 },
      ]);

      // New favourites types.
      expect(profile.favouritesManga).toEqual([
        {
          id: 2,
          title: { romaji: 'Chainsaw Man', english: undefined, native: 'チェンソーマン' },
          coverImage: 'manga-medium.png',
        },
      ]);
      expect(profile.favouritesCharacters).toEqual([
        { id: 3, name: 'Anya Forger', image: 'char-large.png' },
      ]);
      expect(profile.favouritesStaff).toEqual([
        { id: 4, name: 'Tatsuya Endo', image: 'staff.png' },
      ]);
      expect(profile.favouritesStudios).toEqual([{ id: 5, name: 'CloverWorks' }]);
    });

    it('tolerates absent statistics and favourites (empty arrays)', async () => {
      const client = makeClient();
      client.cachedQuery.mockResolvedValue({
        User: { id: 1, name: 'Bond' },
      } as UserProfileResponse);
      const service = new AnimeService(client as unknown as AniListClient);

      const profile = await service.getUserProfile('Bond');

      expect(profile.statistics.voiceActors).toEqual([]);
      expect(profile.statistics.staff).toEqual([]);
      expect(profile.statistics.lengths).toEqual([]);
      expect(profile.favourites).toEqual([]);
      expect(profile.favouritesManga).toEqual([]);
      expect(profile.favouritesStudios).toEqual([]);
    });

    it('drops length/country entries with null values', async () => {
      const raw = makeRawProfile();
      raw.statistics!.anime!.lengths = [
        { length: null, count: 5, meanScore: 70, minutesWatched: 100 },
        { length: '26', count: 3, meanScore: 75, minutesWatched: 200 },
      ];
      raw.statistics!.anime!.countries = [
        { country: null, count: 2, meanScore: 60, minutesWatched: 50 },
      ];
      const client = makeClient();
      client.cachedQuery.mockResolvedValue({ User: raw } as UserProfileResponse);
      const service = new AnimeService(client as unknown as AniListClient);

      const profile = await service.getUserProfile('Anya');

      expect(profile.statistics.lengths).toEqual([
        { value: '26', count: 3, meanScore: 75, minutesWatched: 200 },
      ]);
      expect(profile.statistics.countries).toEqual([]);
    });

    it('falls back to userPreferred / "Unknown" for person favourites and VA names', async () => {
      const raw = makeRawProfile();
      raw.statistics!.anime!.voiceActors = [
        { voiceActor: { id: 1, name: {} }, count: 1, meanScore: 50, minutesWatched: 10 },
      ];
      raw.favourites!.characters = { nodes: [{ id: 9, name: {} }] };
      const client = makeClient();
      client.cachedQuery.mockResolvedValue({ User: raw } as UserProfileResponse);
      const service = new AnimeService(client as unknown as AniListClient);

      const profile = await service.getUserProfile('Anya');

      expect(profile.statistics.voiceActors?.[0].name).toBe('Unknown');
      expect(profile.favouritesCharacters?.[0]).toEqual({
        id: 9,
        name: 'Unknown',
        image: undefined,
      });
    });
  });

  describe('getViewerProfile (authed viewer path)', () => {
    it('returns null when not connected (no token), without querying', async () => {
      const client = makeClient({ hasToken: jest.fn().mockResolvedValue(false) });
      const service = new AnimeService(client as unknown as AniListClient);

      const profile = await service.getViewerProfile();

      expect(profile).toBeNull();
      expect(client.query).not.toHaveBeenCalled();
    });

    it('maps the Viewer object via the shared mapper when connected', async () => {
      const client = makeClient({ hasToken: jest.fn().mockResolvedValue(true) });
      client.query.mockResolvedValue({ Viewer: makeRawProfile() } as ViewerProfileResponse);
      const service = new AnimeService(client as unknown as AniListClient);

      const profile = await service.getViewerProfile();

      expect(profile).not.toBeNull();
      expect(profile!.name).toBe('Anya');
      expect(profile!.favouritesStudios).toEqual([{ id: 5, name: 'CloverWorks' }]);
      // Viewer profile is NOT cached.
      expect(client.cachedQuery).not.toHaveBeenCalled();
    });

    it('propagates a real query error (does not swallow as "not connected")', async () => {
      const client = makeClient({ hasToken: jest.fn().mockResolvedValue(true) });
      client.query.mockRejectedValue(new Error('AniList rate limit exceeded'));
      const service = new AnimeService(client as unknown as AniListClient);

      await expect(service.getViewerProfile()).rejects.toThrow(/rate limit/i);
    });
  });

  describe('getMalViewerProfile (thin MAL profile path)', () => {
    /** Minimal MalClient stub exposing just the `getViewer` the service calls. */
    const makeMalClient = (getViewer: jest.Mock) => ({ getViewer }) as unknown as MalClient;

    it('returns null when the MAL client is not wired (Optional DI absent)', async () => {
      const client = makeClient();
      const service = new AnimeService(client as unknown as AniListClient);

      await expect(service.getMalViewerProfile()).resolves.toBeNull();
    });

    it('returns null when getViewer resolves null (not connected)', async () => {
      const client = makeClient();
      const getViewer = jest.fn().mockResolvedValue(null);
      const service = new AnimeService(
        client as unknown as AniListClient,
        makeMalClient(getViewer)
      );

      await expect(service.getMalViewerProfile()).resolves.toBeNull();
      expect(getViewer).toHaveBeenCalledTimes(1);
    });

    it('maps the viewer identity + all 15 anime_statistics scalars 1:1', async () => {
      const client = makeClient();
      const getViewer = jest.fn().mockResolvedValue({
        id: 7,
        name: 'Loid',
        avatar: 'https://cdn.myanimelist.net/u/7.jpg',
        animeStatistics: {
          num_items_watching: 5,
          num_items_completed: 100,
          num_items_on_hold: 2,
          num_items_dropped: 3,
          num_items_plan_to_watch: 40,
          num_items: 150,
          num_days_watched: 41.2,
          num_days_watching: 1.5,
          num_days_completed: 38.0,
          num_days_on_hold: 0.4,
          num_days_dropped: 1.3,
          num_days: 42.6,
          num_episodes: 3400,
          num_times_rewatched: 12,
          mean_score: 8.1,
        },
      });
      const service = new AnimeService(
        client as unknown as AniListClient,
        makeMalClient(getViewer)
      );

      const profile = await service.getMalViewerProfile();

      expect(profile).toEqual({
        viewer: { id: 7, name: 'Loid', avatar: 'https://cdn.myanimelist.net/u/7.jpg' },
        num_items_watching: 5,
        num_items_completed: 100,
        num_items_on_hold: 2,
        num_items_dropped: 3,
        num_items_plan_to_watch: 40,
        num_items: 150,
        num_days_watched: 41.2,
        num_days_watching: 1.5,
        num_days_completed: 38.0,
        num_days_on_hold: 0.4,
        num_days_dropped: 1.3,
        num_days: 42.6,
        num_episodes: 3400,
        num_times_rewatched: 12,
        mean_score: 8.1,
      });
    });

    it('defaults missing/non-numeric scalars to 0 and coerces numeric strings', async () => {
      const client = makeClient();
      const getViewer = jest.fn().mockResolvedValue({
        id: 1,
        name: 'NewUser',
        // Brand-new account: partial blob, a stringified count, and a junk value.
        animeStatistics: { num_items: '3', mean_score: 'oops', num_episodes: 12 },
      });
      const service = new AnimeService(
        client as unknown as AniListClient,
        makeMalClient(getViewer)
      );

      const profile = await service.getMalViewerProfile();

      expect(profile!.viewer).toEqual({ id: 1, name: 'NewUser', avatar: undefined });
      expect(profile!.num_items).toBe(3); // '3' coerced
      expect(profile!.num_episodes).toBe(12);
      expect(profile!.mean_score).toBe(0); // 'oops' → 0
      expect(profile!.num_items_watching).toBe(0); // absent → 0
    });

    it('defaults every scalar to 0 when anime_statistics is absent entirely', async () => {
      const client = makeClient();
      const getViewer = jest.fn().mockResolvedValue({ id: 2, name: 'Empty' });
      const service = new AnimeService(
        client as unknown as AniListClient,
        makeMalClient(getViewer)
      );

      const profile = await service.getMalViewerProfile();

      // Every numeric scalar defaults to 0 (the `viewer` object is excluded).
      const { viewer: _viewer, ...stats } = profile!;
      expect(Object.values(stats).every(v => v === 0)).toBe(true);
    });
  });

  describe('getViewerActivity', () => {
    it('returns [] when not connected, without querying', async () => {
      const client = makeClient({ hasToken: jest.fn().mockResolvedValue(false) });
      const service = new AnimeService(client as unknown as AniListClient);

      const activities = await service.getViewerActivity();

      expect(activities).toEqual([]);
      expect(client.getViewer).not.toHaveBeenCalled();
      expect(client.query).not.toHaveBeenCalled();
    });

    it('maps list + text activities and drops messages/null/media-less entries', async () => {
      const client = makeClient({ hasToken: jest.fn().mockResolvedValue(true) });
      client.getViewer.mockResolvedValue({ id: 7, name: 'Anya' });
      const nodes: Array<AniListActivityNode | null> = [
        {
          __typename: 'ListActivity',
          id: 11,
          status: 'watched episode',
          progress: '12 - 13',
          createdAt: 1700,
          media: {
            id: 100,
            title: { romaji: 'Frieren', english: null as unknown as string },
            coverImage: { large: 'cover.png' },
          },
        },
        { __typename: 'TextActivity', id: 12, text: 'Great episode!', createdAt: 1600 },
        // MessageActivity — dropped.
        { __typename: 'MessageActivity', id: 13, createdAt: 1500 },
        // ListActivity with deleted media — dropped.
        { __typename: 'ListActivity', id: 14, status: 'completed', createdAt: 1400, media: null },
        null,
      ];
      client.query.mockResolvedValue({ Page: { activities: nodes } } as ViewerActivityResponse);
      const service = new AnimeService(client as unknown as AniListClient);

      const activities = await service.getViewerActivity();

      expect(client.query).toHaveBeenCalledWith(expect.any(String), { userId: 7 });
      expect(activities).toEqual([
        {
          type: 'list',
          id: 11,
          status: 'watched episode',
          progress: '12 - 13',
          media: {
            id: 100,
            title: { romaji: 'Frieren', english: undefined, native: undefined },
            coverImage: 'cover.png',
          },
          createdAt: 1700,
        },
        { type: 'text', id: 12, text: 'Great episode!', createdAt: 1600 },
      ]);
    });

    it('tolerates a null Page (empty feed)', async () => {
      const client = makeClient({ hasToken: jest.fn().mockResolvedValue(true) });
      client.getViewer.mockResolvedValue({ id: 7, name: 'Anya' });
      client.query.mockResolvedValue({ Page: null } as ViewerActivityResponse);
      const service = new AnimeService(client as unknown as AniListClient);

      await expect(service.getViewerActivity()).resolves.toEqual([]);
    });
  });
});

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

describe('AnimeService discover onList + write-through + recommendations', () => {
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
      const service = new AnimeService(client as unknown as AniListClient);

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
      const service = new AnimeService(client as unknown as AniListClient);

      const recs = await service.getRecommendations(99);

      expect(client.query).toHaveBeenCalledWith(expect.any(String), { perPage: 30, mediaId: 99 });
      expect(recs[0].rating).toBe(0);
      expect(recs[0].userRating).toBe('NO_RATING');
    });

    it('tolerates a null Page (empty list)', async () => {
      const client = makeClient();
      client.query.mockResolvedValue({ Page: null } as RecommendationsResponse);
      const service = new AnimeService(client as unknown as AniListClient);

      await expect(service.getRecommendations()).resolves.toEqual([]);
    });
  });

  describe('saveRecommendation (item C4 voting)', () => {
    it('returns null when not connected, without mutating', async () => {
      const client = makeClient({ hasToken: jest.fn().mockResolvedValue(false) });
      const service = new AnimeService(client as unknown as AniListClient);

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
      const service = new AnimeService(client as unknown as AniListClient);

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
      const service = new AnimeService(client as unknown as AniListClient);

      const result = await service.saveRecommendation({
        mediaId: 1,
        mediaRecommendationId: 2,
        rating: 'NO_RATING',
      });

      expect(result).toBe('NO_RATING');
    });
  });
});

describe('AnimeService social graph + following feed', () => {
  describe('getFollowing / getFollowers', () => {
    it('returns [] when not connected, without resolving the viewer or querying', async () => {
      const client = makeClient({ hasToken: jest.fn().mockResolvedValue(false) });
      const service = new AnimeService(client as unknown as AniListClient);

      await expect(service.getFollowing()).resolves.toEqual([]);
      await expect(service.getFollowers()).resolves.toEqual([]);
      expect(client.getViewer).not.toHaveBeenCalled();
      expect(client.query).not.toHaveBeenCalled();
    });

    it('resolves the viewer id and maps following users (drops null nodes)', async () => {
      const client = makeClient({ hasToken: jest.fn().mockResolvedValue(true) });
      client.getViewer.mockResolvedValue({ id: 7, name: 'Anya' });
      client.query.mockResolvedValue({
        Page: {
          following: [
            {
              id: 10,
              name: 'Loid',
              avatar: { large: 'loid-large.png', medium: 'loid-medium.png' },
              isFollowing: true,
              siteUrl: 'https://anilist.co/user/Loid',
            },
            // No avatar.large → falls back to medium; null isFollowing/siteUrl dropped.
            { id: 11, name: 'Yor', avatar: { medium: 'yor-medium.png' }, isFollowing: null },
            null,
          ],
        },
      } as FollowingResponse);
      const service = new AnimeService(client as unknown as AniListClient);

      const users = await service.getFollowing();

      expect(client.query).toHaveBeenCalledWith(expect.any(String), { userId: 7 });
      expect(users).toEqual([
        {
          id: 10,
          name: 'Loid',
          avatar: 'loid-large.png',
          isFollowing: true,
          siteUrl: 'https://anilist.co/user/Loid',
        },
        {
          id: 11,
          name: 'Yor',
          avatar: 'yor-medium.png',
          isFollowing: undefined,
          siteUrl: undefined,
        },
      ]);
    });

    it('honors an explicit userId arg (does not resolve the viewer)', async () => {
      const client = makeClient({ hasToken: jest.fn().mockResolvedValue(true) });
      client.query.mockResolvedValue({ Page: { followers: [] } } as FollowersResponse);
      const service = new AnimeService(client as unknown as AniListClient);

      await service.getFollowers(99);

      expect(client.getViewer).not.toHaveBeenCalled();
      expect(client.query).toHaveBeenCalledWith(expect.any(String), { userId: 99 });
    });

    it('maps followers and tolerates a null Page (empty list)', async () => {
      const client = makeClient({ hasToken: jest.fn().mockResolvedValue(true) });
      client.getViewer.mockResolvedValue({ id: 7, name: 'Anya' });
      client.query.mockResolvedValue({ Page: null } as FollowersResponse);
      const service = new AnimeService(client as unknown as AniListClient);

      await expect(service.getFollowers()).resolves.toEqual([]);
    });
  });

  describe('toggleFollow', () => {
    it('returns null when not connected, without mutating', async () => {
      const client = makeClient({ hasToken: jest.fn().mockResolvedValue(false) });
      const service = new AnimeService(client as unknown as AniListClient);

      const result = await service.toggleFollow(10);

      expect(result).toBeNull();
      expect(client.query).not.toHaveBeenCalled();
    });

    it('toggles follow and returns the new isFollowing state', async () => {
      const client = makeClient({ hasToken: jest.fn().mockResolvedValue(true) });
      client.query.mockResolvedValue({
        ToggleFollow: { id: 10, isFollowing: true },
      } as ToggleFollowResponse);
      const service = new AnimeService(client as unknown as AniListClient);

      const result = await service.toggleFollow(10);

      expect(result).toBe(true);
      expect(client.query).toHaveBeenCalledWith(expect.any(String), { userId: 10 });
    });

    it('falls back to false when the mutation returns a null payload', async () => {
      const client = makeClient({ hasToken: jest.fn().mockResolvedValue(true) });
      client.query.mockResolvedValue({ ToggleFollow: null } as ToggleFollowResponse);
      const service = new AnimeService(client as unknown as AniListClient);

      await expect(service.toggleFollow(10)).resolves.toBe(false);
    });
  });

  describe('getSocialFeed', () => {
    it('returns [] when not connected, without querying', async () => {
      const client = makeClient({ hasToken: jest.fn().mockResolvedValue(false) });
      const service = new AnimeService(client as unknown as AniListClient);

      await expect(service.getSocialFeed()).resolves.toEqual([]);
      expect(client.query).not.toHaveBeenCalled();
    });

    it('maps list + text activities WITH their author, never resolving the viewer', async () => {
      const client = makeClient({ hasToken: jest.fn().mockResolvedValue(true) });
      const nodes: Array<AniListActivityNode | null> = [
        {
          __typename: 'ListActivity',
          id: 21,
          status: 'watched episode',
          progress: '5',
          createdAt: 2100,
          user: { id: 10, name: 'Loid', avatar: { large: 'loid.png' } },
          media: {
            id: 200,
            title: { romaji: 'Frieren', english: null as unknown as string },
            coverImage: { large: 'cover.png' },
          },
        },
        {
          __typename: 'TextActivity',
          id: 22,
          text: 'Peanuts!',
          createdAt: 2000,
          user: { id: 11, name: 'Anya', avatar: { medium: 'anya-medium.png' } },
        },
        // ListActivity with deleted media — dropped.
        { __typename: 'ListActivity', id: 23, createdAt: 1900, media: null },
        null,
      ];
      client.query.mockResolvedValue({ Page: { activities: nodes } } as SocialFeedResponse);
      const service = new AnimeService(client as unknown as AniListClient);

      const activities = await service.getSocialFeed();

      // The social feed is token-relative — it must NOT resolve a userId.
      expect(client.getViewer).not.toHaveBeenCalled();
      expect(client.query).toHaveBeenCalledWith(expect.any(String));
      expect(activities).toEqual([
        {
          type: 'list',
          id: 21,
          status: 'watched episode',
          progress: '5',
          media: {
            id: 200,
            title: { romaji: 'Frieren', english: undefined, native: undefined },
            coverImage: 'cover.png',
          },
          createdAt: 2100,
          user: { id: 10, name: 'Loid', avatar: 'loid.png' },
        },
        {
          type: 'text',
          id: 22,
          text: 'Peanuts!',
          createdAt: 2000,
          user: { id: 11, name: 'Anya', avatar: 'anya-medium.png' },
        },
      ]);
    });

    it('tolerates a null Page (empty feed)', async () => {
      const client = makeClient({ hasToken: jest.fn().mockResolvedValue(true) });
      client.query.mockResolvedValue({ Page: null } as SocialFeedResponse);
      const service = new AnimeService(client as unknown as AniListClient);

      await expect(service.getSocialFeed()).resolves.toEqual([]);
    });
  });
});

describe('AnimeService notifications', () => {
  describe('getNotifications', () => {
    it('returns empty result when not connected, without querying', async () => {
      const client = makeClient({ hasToken: jest.fn().mockResolvedValue(false) });
      const service = new AnimeService(client as unknown as AniListClient);

      await expect(service.getNotifications()).resolves.toEqual({
        notifications: [],
        unreadCount: 0,
      });
      expect(client.query).not.toHaveBeenCalled();
    });

    it('maps every variant, drops unknown/null/required-field-missing entries', async () => {
      const client = makeClient({ hasToken: jest.fn().mockResolvedValue(true) });
      const nodes: Array<AniListNotificationNode | null> = [
        {
          __typename: 'AiringNotification',
          id: 1,
          type: 'AIRING',
          episode: 12,
          contexts: ['Episode ', ' of ', ' aired.'],
          createdAt: 1700,
          media: {
            id: 100,
            title: { romaji: 'Frieren', english: null as unknown as string },
            coverImage: { large: 'cover.png' },
          },
        },
        {
          __typename: 'FollowingNotification',
          id: 2,
          type: 'FOLLOWING',
          context: 'followed you',
          createdAt: 1690,
          user: { id: 10, name: 'Loid', avatar: { large: 'loid.png' } },
        },
        {
          __typename: 'ActivityLikeNotification',
          id: 3,
          type: 'ACTIVITY_LIKE',
          context: 'liked your activity',
          activityId: 555,
          createdAt: 1680,
          user: { id: 11, name: 'Yor', avatar: { medium: 'yor-medium.png' } },
        },
        {
          __typename: 'ActivityReplyNotification',
          id: 4,
          type: 'ACTIVITY_REPLY',
          context: 'replied to your activity',
          activityId: 556,
          createdAt: 1670,
          user: { id: 12, name: 'Anya' },
        },
        {
          __typename: 'ActivityMentionNotification',
          id: 5,
          type: 'ACTIVITY_MENTION',
          context: 'mentioned you in an activity',
          activityId: 557,
          createdAt: 1660,
          user: { id: 13, name: 'Bond' },
        },
        {
          __typename: 'RelatedMediaAdditionNotification',
          id: 6,
          type: 'RELATED_MEDIA_ADDITION',
          context: 'was recently added to the site',
          createdAt: 1650,
          media: { id: 200, title: { romaji: 'Spy x Family' }, coverImage: { medium: 'sxf.png' } },
        },
        // Unhandled union member — dropped.
        { __typename: 'ActivityMessageNotification', id: 7, createdAt: 1640 },
        // Airing with deleted media — dropped.
        { __typename: 'AiringNotification', id: 8, episode: 1, createdAt: 1630, media: null },
        // Following with deleted user — dropped.
        { __typename: 'FollowingNotification', id: 9, createdAt: 1620, user: null },
        null,
      ];
      client.query.mockResolvedValue({
        Viewer: { unreadNotificationCount: 4 },
        Page: { notifications: nodes },
      } as NotificationsResponse);
      const service = new AnimeService(client as unknown as AniListClient);

      const result = await service.getNotifications();

      // Read-only: must NOT reset, must NOT resolve a viewer id.
      expect(client.query).toHaveBeenCalledWith(expect.any(String));
      expect(client.getViewer).not.toHaveBeenCalled();
      expect(result.unreadCount).toBe(4);
      expect(result.notifications).toEqual([
        {
          type: 'airing',
          id: 1,
          context: 'Episode 12 of Frieren aired.',
          createdAt: 1700,
          episode: 12,
          media: {
            id: 100,
            title: { romaji: 'Frieren', english: undefined, native: undefined },
            coverImage: 'cover.png',
          },
        },
        {
          type: 'following',
          id: 2,
          context: 'followed you',
          createdAt: 1690,
          user: { id: 10, name: 'Loid', avatar: 'loid.png' },
        },
        {
          type: 'activity',
          id: 3,
          context: 'liked your activity',
          createdAt: 1680,
          activityId: 555,
          user: { id: 11, name: 'Yor', avatar: 'yor-medium.png' },
        },
        {
          type: 'activity',
          id: 4,
          context: 'replied to your activity',
          createdAt: 1670,
          activityId: 556,
          user: { id: 12, name: 'Anya', avatar: undefined },
        },
        {
          type: 'activity',
          id: 5,
          context: 'mentioned you in an activity',
          createdAt: 1660,
          activityId: 557,
          user: { id: 13, name: 'Bond', avatar: undefined },
        },
        {
          type: 'related-media',
          id: 6,
          context: 'was recently added to the site',
          createdAt: 1650,
          media: {
            id: 200,
            title: { romaji: 'Spy x Family', english: undefined, native: undefined },
            coverImage: 'sxf.png',
          },
        },
      ]);
    });

    it('falls back to a default airing context when contexts is absent', async () => {
      const client = makeClient({ hasToken: jest.fn().mockResolvedValue(true) });
      client.query.mockResolvedValue({
        Viewer: { unreadNotificationCount: 1 },
        Page: {
          notifications: [
            {
              __typename: 'AiringNotification',
              id: 1,
              episode: 5,
              createdAt: 1700,
              media: { id: 100, title: { english: 'Bocchi the Rock!' }, coverImage: {} },
            },
          ],
        },
      } as NotificationsResponse);
      const service = new AnimeService(client as unknown as AniListClient);

      const result = await service.getNotifications();

      expect(result.notifications[0]).toMatchObject({
        type: 'airing',
        context: 'Episode 5 of Bocchi the Rock! aired.',
      });
    });

    it('defaults unreadCount to 0 and tolerates a null Page', async () => {
      const client = makeClient({ hasToken: jest.fn().mockResolvedValue(true) });
      client.query.mockResolvedValue({ Viewer: null, Page: null } as NotificationsResponse);
      const service = new AnimeService(client as unknown as AniListClient);

      await expect(service.getNotifications()).resolves.toEqual({
        notifications: [],
        unreadCount: 0,
      });
    });
  });

  describe('markNotificationsRead', () => {
    it('returns 0 without querying when not connected', async () => {
      const client = makeClient({ hasToken: jest.fn().mockResolvedValue(false) });
      const service = new AnimeService(client as unknown as AniListClient);

      await expect(service.markNotificationsRead()).resolves.toBe(0);
      expect(client.query).not.toHaveBeenCalled();
    });

    it('fires the reset query and returns 0 when connected', async () => {
      const client = makeClient({ hasToken: jest.fn().mockResolvedValue(true) });
      client.query.mockResolvedValue({ Page: { notifications: [] } });
      const service = new AnimeService(client as unknown as AniListClient);

      await expect(service.markNotificationsRead()).resolves.toBe(0);
      expect(client.query).toHaveBeenCalledTimes(1);
      expect(client.query).toHaveBeenCalledWith(expect.any(String));
    });
  });
});
