import { AnimeEvents, MalEvents } from '@shiroani/shared';
import { createAnimeHandlers } from '../anime.handlers';

const PAGE_INFO = { total: 1, currentPage: 1, lastPage: 1, hasNextPage: false };
const EMPTY_PAGE_INFO = { total: 0, currentPage: 1, lastPage: 1, hasNextPage: false };
const MEDIA = { id: 1, title: { romaji: 'a' }, coverImage: {}, status: 'RELEASING', genres: [] };

function build() {
  const page = { media: [MEDIA], pageInfo: PAGE_INFO };
  const anime = {
    searchAnime: jest.fn(async () => page),
    getAnimeDetails: jest.fn(async () => MEDIA),
    getAiringSchedule: jest.fn(async () => ({ airingSchedules: [], pageInfo: PAGE_INFO })),
    getTrending: jest.fn(async () => page),
    getPopularThisSeason: jest.fn(async () => page),
    getSeasonalAnime: jest.fn(async () => page),
    getRandomByGenre: jest.fn(async () => page),
    saveMediaListEntry: jest.fn(async () => 123),
  };
  const profile = {
    getUserProfile: jest.fn(async () => ({ name: 'u' })),
    getViewerProfile: jest.fn(async () => null),
    getMalViewerProfile: jest.fn(async () => null),
  };
  const social = {
    getViewerActivity: jest.fn(async () => []),
    getFollowing: jest.fn(async () => []),
    getFollowers: jest.fn(async () => []),
    toggleFollow: jest.fn(async () => true),
    getSocialFeed: jest.fn(async () => []),
    getNotifications: jest.fn(async () => ({ notifications: [], unreadCount: 2 })),
    markNotificationsRead: jest.fn(async () => 0),
  };
  const recommendations = {
    getRecommendations: jest.fn(async () => []),
    saveRecommendation: jest.fn(async () => 'RATE_UP'),
  };
  const handlers = createAnimeHandlers(
    anime as never,
    profile as never,
    social as never,
    recommendations as never
  );
  return { anime, profile, social, recommendations, handlers };
}

describe('anime handlers', () => {
  it.each([
    [AnimeEvents.SEARCH, { query: 'a' }],
    [AnimeEvents.GET_TRENDING, {}],
    [AnimeEvents.GET_POPULAR, {}],
    [AnimeEvents.GET_SEASONAL, { year: 2026, season: 'FALL' }],
    [AnimeEvents.GET_RANDOM, { includedGenres: ['Action'] }],
  ] as const)(
    'maps %s to the results and pageInfo the discover views read',
    async (channel, req) => {
      const { handlers } = build();
      await expect(handlers[channel](req)).resolves.toEqual({
        results: [MEDIA],
        pageInfo: PAGE_INFO,
      });
    }
  );

  it('passes sort and filters through to the search', async () => {
    const { handlers, anime } = build();

    await handlers[AnimeEvents.SEARCH]({ query: 'a', page: 2, sort: 'score' });

    expect(anime.searchAnime).toHaveBeenCalledWith('a', 2, undefined, 'score', undefined);
  });

  it('wraps details', async () => {
    const { handlers, anime } = build();

    await expect(handlers[AnimeEvents.GET_DETAILS]({ anilistId: 1 })).resolves.toEqual({
      anime: MEDIA,
    });
    expect(anime.getAnimeDetails).toHaveBeenCalledWith(1);
  });

  it('turns the airing range into dates before the service sees it', async () => {
    const { handlers, anime } = build();
    const startDate = '2026-11-01T00:00:00.000Z';
    const endDate = '2026-11-02T00:00:00.000Z';

    await handlers[AnimeEvents.GET_AIRING]({ startDate, endDate });

    expect(anime.getAiringSchedule).toHaveBeenCalledWith(
      new Date(startDate),
      new Date(endDate),
      undefined
    );
  });

  it('answers the authed reads and writes in their documented shapes', async () => {
    const { handlers } = build();

    await expect(handlers[AnimeEvents.GET_USER_PROFILE]({ username: 'u' })).resolves.toEqual({
      profile: { name: 'u' },
    });
    await expect(handlers[AnimeEvents.GET_VIEWER_PROFILE](undefined)).resolves.toEqual({
      profile: null,
    });
    await expect(handlers[MalEvents.GET_VIEWER_PROFILE](undefined)).resolves.toEqual({
      profile: null,
    });
    await expect(handlers[AnimeEvents.GET_VIEWER_ACTIVITY](undefined)).resolves.toEqual({
      activities: [],
    });
    await expect(handlers[AnimeEvents.GET_SOCIAL_FEED](undefined)).resolves.toEqual({
      activities: [],
    });
    await expect(handlers[AnimeEvents.GET_NOTIFICATIONS](undefined)).resolves.toEqual({
      notifications: [],
      unreadCount: 2,
    });
    await expect(handlers[AnimeEvents.MARK_NOTIFICATIONS_READ](undefined)).resolves.toEqual({
      unreadCount: 0,
    });
    await expect(handlers[AnimeEvents.TOGGLE_FOLLOW]({ userId: 1 })).resolves.toEqual({
      isFollowing: true,
    });
    await expect(
      handlers[AnimeEvents.SAVE_MEDIA_LIST_ENTRY]({ mediaId: 1, status: 'PLANNING' })
    ).resolves.toEqual({ updatedAt: 123 });
    await expect(
      handlers[AnimeEvents.SAVE_RECOMMENDATION]({
        mediaId: 1,
        mediaRecommendationId: 2,
        rating: 'RATE_UP',
      })
    ).resolves.toEqual({ userRating: 'RATE_UP' });
  });

  it('accepts an absent optional payload on the follow and recommendation reads', async () => {
    const { handlers, social, recommendations } = build();

    await expect(handlers[AnimeEvents.GET_FOLLOWING](undefined)).resolves.toEqual({ users: [] });
    await expect(handlers[AnimeEvents.GET_FOLLOWERS]({ userId: 3 })).resolves.toEqual({
      users: [],
    });
    await expect(handlers[AnimeEvents.GET_RECOMMENDATIONS](undefined)).resolves.toEqual({
      recommendations: [],
    });

    expect(social.getFollowing).toHaveBeenCalledWith(undefined);
    expect(social.getFollowers).toHaveBeenCalledWith(3);
    expect(recommendations.getRecommendations).toHaveBeenCalledWith(undefined);
  });

  it('never reaches the service with an invalid payload', async () => {
    const { handlers, anime } = build();

    const result = await handlers[AnimeEvents.GET_DETAILS]({ anilistId: 'x' });

    expect(result.anime).toBeNull();
    expect(typeof result.error).toBe('string');
    expect(anime.getAnimeDetails).not.toHaveBeenCalled();
  });

  it('returns the default plus error when the service throws', async () => {
    const { handlers, anime, social } = build();
    anime.getTrending.mockRejectedValue(new Error('rate limited'));
    social.toggleFollow.mockRejectedValue(new Error('rate limited'));

    await expect(handlers[AnimeEvents.GET_TRENDING]({})).resolves.toEqual({
      results: [],
      pageInfo: EMPTY_PAGE_INFO,
      error: 'rate limited',
    });
    // null, not false: false would read as "now unfollowed".
    await expect(handlers[AnimeEvents.TOGGLE_FOLLOW]({ userId: 1 })).resolves.toEqual({
      isFollowing: null,
      error: 'rate limited',
    });
  });

  it('returns a response that survives structured clone like it survived JSON', async () => {
    const { handlers, anime } = build();
    anime.getAnimeDetails.mockResolvedValue({
      ...MEDIA,
      onList: undefined,
      trailer: null,
    } as never);

    const result = await handlers[AnimeEvents.GET_DETAILS]({ anilistId: 1 });

    expect(structuredClone(result)).toEqual(JSON.parse(JSON.stringify(result)));
  });
});
