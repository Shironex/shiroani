import { AnimeProfileService } from '../anime-profile.service';
import type { AniListClient } from '../anilist-client';
import type { MalClient } from '../mal-client';
import type { AniListUserProfile, UserProfileResponse, ViewerProfileResponse } from '../types';

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

describe('AnimeProfileService', () => {
  describe('getUserProfile (public username path)', () => {
    it('maps the full statistics arrays and all-type favourites', async () => {
      const client = makeClient();
      client.cachedQuery.mockResolvedValue({ User: makeRawProfile() } as UserProfileResponse);
      const service = new AnimeProfileService(client as unknown as AniListClient);

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
      const service = new AnimeProfileService(client as unknown as AniListClient);

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
      const service = new AnimeProfileService(client as unknown as AniListClient);

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
      const service = new AnimeProfileService(client as unknown as AniListClient);

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
      const service = new AnimeProfileService(client as unknown as AniListClient);

      const profile = await service.getViewerProfile();

      expect(profile).toBeNull();
      expect(client.query).not.toHaveBeenCalled();
    });

    it('maps the Viewer object via the shared mapper when connected', async () => {
      const client = makeClient({ hasToken: jest.fn().mockResolvedValue(true) });
      client.query.mockResolvedValue({ Viewer: makeRawProfile() } as ViewerProfileResponse);
      const service = new AnimeProfileService(client as unknown as AniListClient);

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
      const service = new AnimeProfileService(client as unknown as AniListClient);

      await expect(service.getViewerProfile()).rejects.toThrow(/rate limit/i);
    });
  });

  describe('getMalViewerProfile (thin MAL profile path)', () => {
    /** Minimal MalClient stub exposing just the `getViewer` the service calls. */
    const makeMalClient = (getViewer: jest.Mock) => ({ getViewer }) as unknown as MalClient;

    it('returns null when the MAL client is not wired (Optional DI absent)', async () => {
      const client = makeClient();
      const service = new AnimeProfileService(client as unknown as AniListClient);

      await expect(service.getMalViewerProfile()).resolves.toBeNull();
    });

    it('returns null when getViewer resolves null (not connected)', async () => {
      const client = makeClient();
      const getViewer = jest.fn().mockResolvedValue(null);
      const service = new AnimeProfileService(
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
      const service = new AnimeProfileService(
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
      const service = new AnimeProfileService(
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
      const service = new AnimeProfileService(
        client as unknown as AniListClient,
        makeMalClient(getViewer)
      );

      const profile = await service.getMalViewerProfile();

      // Every numeric scalar defaults to 0 (the `viewer` object is excluded).
      const { viewer: _viewer, ...stats } = profile!;
      expect(Object.values(stats).every(v => v === 0)).toBe(true);
    });
  });
});
