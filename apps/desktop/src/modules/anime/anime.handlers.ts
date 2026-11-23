import {
  AnimeEvents,
  MalEvents,
  createLogger,
  animeSearchPayloadSchema,
  animeGetDetailsPayloadSchema,
  animeGetAiringPayloadSchema,
  animeGetTrendingPayloadSchema,
  animeGetPopularPayloadSchema,
  animeGetSeasonalPayloadSchema,
  animeGetRandomPayloadSchema,
  animeGetUserProfilePayloadSchema,
  animeSaveMediaListEntryPayloadSchema,
  animeGetRecommendationsPayloadSchema,
  animeSaveRecommendationPayloadSchema,
  animeGetFollowPayloadSchema,
  animeToggleFollowPayloadSchema,
} from '@shiroani/shared';
import type { BackendHandlers } from '../kernel/backend-handlers';
import { handleGatewayRequest } from '../kernel/gateway-handler';
import type { AnimeProfileService } from './anime-profile.service';
import type { AnimeRecommendationsService } from './anime-recommendations.service';
import type { AnimeSocialService } from './anime-social.service';
import type { AnimeService } from './anime.service';

const logger = createLogger('AnimeHandlers');

const EMPTY_PAGE_INFO = { total: 0, currentPage: 1, lastPage: 1, hasNextPage: false };

type AnimeHandlers = Pick<
  BackendHandlers,
  | typeof AnimeEvents.SEARCH
  | typeof AnimeEvents.GET_DETAILS
  | typeof AnimeEvents.GET_AIRING
  | typeof AnimeEvents.GET_TRENDING
  | typeof AnimeEvents.GET_POPULAR
  | typeof AnimeEvents.GET_SEASONAL
  | typeof AnimeEvents.GET_RANDOM
  | typeof AnimeEvents.GET_USER_PROFILE
  | typeof AnimeEvents.GET_VIEWER_PROFILE
  | typeof MalEvents.GET_VIEWER_PROFILE
  | typeof AnimeEvents.GET_VIEWER_ACTIVITY
  | typeof AnimeEvents.SAVE_MEDIA_LIST_ENTRY
  | typeof AnimeEvents.GET_RECOMMENDATIONS
  | typeof AnimeEvents.SAVE_RECOMMENDATION
  | typeof AnimeEvents.GET_FOLLOWING
  | typeof AnimeEvents.GET_FOLLOWERS
  | typeof AnimeEvents.TOGGLE_FOLLOW
  | typeof AnimeEvents.GET_SOCIAL_FEED
  | typeof AnimeEvents.GET_NOTIFICATIONS
  | typeof AnimeEvents.MARK_NOTIFICATIONS_READ
>;

export function createAnimeHandlers(
  anime: AnimeService,
  profile: AnimeProfileService,
  social: AnimeSocialService,
  recommendations: AnimeRecommendationsService
): AnimeHandlers {
  return {
    [AnimeEvents.SEARCH]: payload =>
      handleGatewayRequest({
        logger,
        action: AnimeEvents.SEARCH,
        defaultResult: { results: [], pageInfo: EMPTY_PAGE_INFO },
        schema: animeSearchPayloadSchema,
        payload,
        handler: async parsed => {
          const result = await anime.searchAnime(
            parsed.query,
            parsed.page,
            undefined,
            parsed.sort,
            parsed.filters
          );
          return { results: result.media, pageInfo: result.pageInfo };
        },
      }),

    [AnimeEvents.GET_DETAILS]: payload =>
      handleGatewayRequest({
        logger,
        action: AnimeEvents.GET_DETAILS,
        defaultResult: { anime: null },
        schema: animeGetDetailsPayloadSchema,
        payload,
        handler: async parsed => {
          return { anime: await anime.getAnimeDetails(parsed.anilistId) };
        },
      }),

    [AnimeEvents.GET_AIRING]: payload =>
      handleGatewayRequest({
        logger,
        action: AnimeEvents.GET_AIRING,
        defaultResult: { airingSchedules: [], pageInfo: EMPTY_PAGE_INFO },
        schema: animeGetAiringPayloadSchema,
        payload,
        handler: async parsed => {
          const startDate = new Date(parsed.startDate);
          const endDate = new Date(parsed.endDate);
          const result = await anime.getAiringSchedule(startDate, endDate, parsed.page);
          return { airingSchedules: result.airingSchedules, pageInfo: result.pageInfo };
        },
      }),

    [AnimeEvents.GET_TRENDING]: payload =>
      handleGatewayRequest({
        logger,
        action: AnimeEvents.GET_TRENDING,
        defaultResult: { results: [], pageInfo: EMPTY_PAGE_INFO },
        schema: animeGetTrendingPayloadSchema,
        payload,
        handler: async parsed => {
          const result = await anime.getTrending(
            parsed.page,
            undefined,
            parsed.sort,
            parsed.filters
          );
          return { results: result.media, pageInfo: result.pageInfo };
        },
      }),

    [AnimeEvents.GET_POPULAR]: payload =>
      handleGatewayRequest({
        logger,
        action: AnimeEvents.GET_POPULAR,
        defaultResult: { results: [], pageInfo: EMPTY_PAGE_INFO },
        schema: animeGetPopularPayloadSchema,
        payload,
        handler: async parsed => {
          const result = await anime.getPopularThisSeason(
            parsed.page,
            undefined,
            parsed.sort,
            parsed.filters
          );
          return { results: result.media, pageInfo: result.pageInfo };
        },
      }),

    [AnimeEvents.GET_SEASONAL]: payload =>
      handleGatewayRequest({
        logger,
        action: AnimeEvents.GET_SEASONAL,
        defaultResult: { results: [], pageInfo: EMPTY_PAGE_INFO },
        schema: animeGetSeasonalPayloadSchema,
        payload,
        handler: async parsed => {
          const result = await anime.getSeasonalAnime(
            parsed.year,
            parsed.season,
            parsed.page,
            undefined,
            parsed.sort,
            parsed.filters
          );
          return { results: result.media, pageInfo: result.pageInfo };
        },
      }),

    [AnimeEvents.GET_RANDOM]: payload =>
      handleGatewayRequest({
        logger,
        action: AnimeEvents.GET_RANDOM,
        defaultResult: { results: [], pageInfo: EMPTY_PAGE_INFO },
        schema: animeGetRandomPayloadSchema,
        payload,
        handler: async parsed => {
          const result = await anime.getRandomByGenre(
            parsed.includedGenres,
            parsed.excludedGenres,
            parsed.perPage
          );
          return { results: result.media, pageInfo: result.pageInfo };
        },
      }),

    [AnimeEvents.GET_USER_PROFILE]: payload =>
      handleGatewayRequest({
        logger,
        action: AnimeEvents.GET_USER_PROFILE,
        defaultResult: { profile: null },
        schema: animeGetUserProfilePayloadSchema,
        payload,
        handler: async parsed => {
          return { profile: await profile.getUserProfile(parsed.username) };
        },
      }),

    [AnimeEvents.GET_VIEWER_PROFILE]: () =>
      handleGatewayRequest({
        logger,
        action: AnimeEvents.GET_VIEWER_PROFILE,
        defaultResult: { profile: null },
        handler: async () => {
          return { profile: await profile.getViewerProfile() };
        },
      }),

    [MalEvents.GET_VIEWER_PROFILE]: () =>
      handleGatewayRequest({
        logger,
        action: MalEvents.GET_VIEWER_PROFILE,
        defaultResult: { profile: null },
        handler: async () => {
          return { profile: await profile.getMalViewerProfile() };
        },
      }),

    [AnimeEvents.GET_VIEWER_ACTIVITY]: () =>
      handleGatewayRequest({
        logger,
        action: AnimeEvents.GET_VIEWER_ACTIVITY,
        defaultResult: { activities: [] },
        handler: async () => {
          const activities = await social.getViewerActivity();
          return { activities };
        },
      }),

    [AnimeEvents.SAVE_MEDIA_LIST_ENTRY]: payload =>
      handleGatewayRequest({
        logger,
        action: AnimeEvents.SAVE_MEDIA_LIST_ENTRY,
        defaultResult: { updatedAt: null },
        schema: animeSaveMediaListEntryPayloadSchema,
        payload,
        handler: async parsed => {
          const updatedAt = await anime.saveMediaListEntry(parsed);
          return { updatedAt };
        },
      }),

    [AnimeEvents.GET_RECOMMENDATIONS]: payload =>
      handleGatewayRequest({
        logger,
        action: AnimeEvents.GET_RECOMMENDATIONS,
        defaultResult: { recommendations: [] },
        schema: animeGetRecommendationsPayloadSchema,
        payload,
        handler: async parsed => {
          return { recommendations: await recommendations.getRecommendations(parsed?.mediaId) };
        },
      }),

    [AnimeEvents.SAVE_RECOMMENDATION]: payload =>
      handleGatewayRequest({
        logger,
        action: AnimeEvents.SAVE_RECOMMENDATION,
        defaultResult: { userRating: null },
        schema: animeSaveRecommendationPayloadSchema,
        payload,
        handler: async parsed => {
          const userRating = await recommendations.saveRecommendation(parsed);
          return { userRating };
        },
      }),

    [AnimeEvents.GET_FOLLOWING]: payload =>
      handleGatewayRequest({
        logger,
        action: AnimeEvents.GET_FOLLOWING,
        defaultResult: { users: [] },
        schema: animeGetFollowPayloadSchema,
        payload,
        handler: async parsed => {
          const users = await social.getFollowing(parsed?.userId);
          return { users };
        },
      }),

    [AnimeEvents.GET_FOLLOWERS]: payload =>
      handleGatewayRequest({
        logger,
        action: AnimeEvents.GET_FOLLOWERS,
        defaultResult: { users: [] },
        schema: animeGetFollowPayloadSchema,
        payload,
        handler: async parsed => {
          const users = await social.getFollowers(parsed?.userId);
          return { users };
        },
      }),

    [AnimeEvents.TOGGLE_FOLLOW]: payload =>
      handleGatewayRequest({
        logger,
        action: AnimeEvents.TOGGLE_FOLLOW,
        // null (not false) matches the boolean | null contract, because false would read
        // as "now unfollowed" to a client that can't distinguish it from a no-op.
        defaultResult: { isFollowing: null },
        schema: animeToggleFollowPayloadSchema,
        payload,
        handler: async parsed => {
          const isFollowing = await social.toggleFollow(parsed.userId);
          return { isFollowing };
        },
      }),

    [AnimeEvents.GET_SOCIAL_FEED]: () =>
      handleGatewayRequest({
        logger,
        action: AnimeEvents.GET_SOCIAL_FEED,
        defaultResult: { activities: [] },
        handler: async () => {
          const activities = await social.getSocialFeed();
          return { activities };
        },
      }),

    [AnimeEvents.GET_NOTIFICATIONS]: () =>
      handleGatewayRequest({
        logger,
        action: AnimeEvents.GET_NOTIFICATIONS,
        defaultResult: { notifications: [], unreadCount: 0 },
        handler: async () => {
          return social.getNotifications();
        },
      }),

    [AnimeEvents.MARK_NOTIFICATIONS_READ]: () =>
      handleGatewayRequest({
        logger,
        action: AnimeEvents.MARK_NOTIFICATIONS_READ,
        defaultResult: { unreadCount: 0 },
        handler: async () => {
          const unreadCount = await social.markNotificationsRead();
          return { unreadCount };
        },
      }),
  };
}
