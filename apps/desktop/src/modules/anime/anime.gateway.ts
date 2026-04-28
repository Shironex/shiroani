import { WebSocketGateway, SubscribeMessage, MessageBody } from '@nestjs/websockets';
import { UseGuards } from '@nestjs/common';
import {
  AnimeEvents,
  createLogger,
  animeSearchPayloadSchema,
  animeSearchByTitlePayloadSchema,
  animeGetDetailsPayloadSchema,
  animeGetAiringPayloadSchema,
  animeGetTrendingPayloadSchema,
  animeGetPopularPayloadSchema,
  animeGetSeasonalPayloadSchema,
  animeGetRandomPayloadSchema,
  animeGetUserProfilePayloadSchema,
} from '@shiroani/shared';
import { CORS_CONFIG } from '../kernel/cors.config';
import { WsThrottlerGuard } from '../kernel/ws-throttler.guard';
import { handleGatewayRequest } from '../kernel/gateway-handler';
import { AnimeService } from './anime.service';

const logger = createLogger('AnimeGateway');

const EMPTY_PAGE_INFO = { total: 0, currentPage: 1, lastPage: 1, hasNextPage: false };

@WebSocketGateway({ cors: CORS_CONFIG })
@UseGuards(WsThrottlerGuard)
export class AnimeGateway {
  constructor(private readonly animeService: AnimeService) {
    logger.info('AnimeGateway initialized');
  }

  @SubscribeMessage(AnimeEvents.SEARCH)
  async handleSearch(@MessageBody() payload: unknown) {
    return handleGatewayRequest({
      logger,
      action: 'anime:search',
      defaultResult: { results: [], pageInfo: EMPTY_PAGE_INFO },
      schema: animeSearchPayloadSchema,
      payload,
      handler: async parsed => {
        const result = await this.animeService.searchAnime(parsed.query, parsed.page);
        return { results: result.media, pageInfo: result.pageInfo };
      },
    });
  }

  @SubscribeMessage(AnimeEvents.SEARCH_BY_TITLE)
  async handleSearchByTitle(@MessageBody() payload: unknown) {
    return handleGatewayRequest({
      logger,
      action: 'anime:search-by-title',
      defaultResult: { results: [] },
      schema: animeSearchByTitlePayloadSchema,
      payload,
      handler: async parsed => {
        const results = await this.animeService.searchByTitle(parsed.title);
        return { results };
      },
    });
  }

  @SubscribeMessage(AnimeEvents.GET_DETAILS)
  async handleGetDetails(@MessageBody() payload: unknown) {
    return handleGatewayRequest({
      logger,
      action: 'anime:get-details',
      defaultResult: { anime: null },
      schema: animeGetDetailsPayloadSchema,
      payload,
      handler: async parsed => {
        const anime = await this.animeService.getAnimeDetails(parsed.anilistId);
        return { anime };
      },
    });
  }

  @SubscribeMessage(AnimeEvents.GET_AIRING)
  async handleGetAiring(@MessageBody() payload: unknown) {
    return handleGatewayRequest({
      logger,
      action: 'anime:get-airing',
      defaultResult: { airingSchedules: [], pageInfo: EMPTY_PAGE_INFO },
      schema: animeGetAiringPayloadSchema,
      payload,
      handler: async parsed => {
        const startDate = new Date(parsed.startDate);
        const endDate = new Date(parsed.endDate);
        const result = await this.animeService.getAiringSchedule(startDate, endDate, parsed.page);
        return { airingSchedules: result.airingSchedules, pageInfo: result.pageInfo };
      },
    });
  }

  @SubscribeMessage(AnimeEvents.GET_TRENDING)
  async handleGetTrending(@MessageBody() payload: unknown) {
    return handleGatewayRequest({
      logger,
      action: 'anime:get-trending',
      defaultResult: { results: [], pageInfo: EMPTY_PAGE_INFO },
      schema: animeGetTrendingPayloadSchema,
      payload,
      handler: async parsed => {
        const result = await this.animeService.getTrending(parsed.page);
        return { results: result.media, pageInfo: result.pageInfo };
      },
    });
  }

  @SubscribeMessage(AnimeEvents.GET_POPULAR)
  async handleGetPopular(@MessageBody() payload: unknown) {
    return handleGatewayRequest({
      logger,
      action: 'anime:get-popular',
      defaultResult: { results: [], pageInfo: EMPTY_PAGE_INFO },
      schema: animeGetPopularPayloadSchema,
      payload,
      handler: async parsed => {
        const result = await this.animeService.getPopularThisSeason(parsed.page);
        return { results: result.media, pageInfo: result.pageInfo };
      },
    });
  }

  @SubscribeMessage(AnimeEvents.GET_SEASONAL)
  async handleGetSeasonal(@MessageBody() payload: unknown) {
    return handleGatewayRequest({
      logger,
      action: 'anime:get-seasonal',
      defaultResult: { results: [], pageInfo: EMPTY_PAGE_INFO },
      schema: animeGetSeasonalPayloadSchema,
      payload,
      handler: async parsed => {
        const result = await this.animeService.getSeasonalAnime(
          parsed.year,
          parsed.season,
          parsed.page
        );
        return { results: result.media, pageInfo: result.pageInfo };
      },
    });
  }

  @SubscribeMessage(AnimeEvents.GET_RANDOM)
  async handleGetRandom(@MessageBody() payload: unknown) {
    return handleGatewayRequest({
      logger,
      action: 'anime:get-random',
      defaultResult: { results: [], pageInfo: EMPTY_PAGE_INFO },
      schema: animeGetRandomPayloadSchema,
      payload,
      handler: async parsed => {
        const result = await this.animeService.getRandomByGenre(
          parsed.includedGenres,
          parsed.excludedGenres,
          parsed.perPage
        );
        return { results: result.media, pageInfo: result.pageInfo };
      },
    });
  }

  @SubscribeMessage(AnimeEvents.GET_USER_PROFILE)
  async handleGetUserProfile(@MessageBody() payload: unknown) {
    return handleGatewayRequest({
      logger,
      action: 'anime:get-user-profile',
      defaultResult: { profile: null },
      schema: animeGetUserProfilePayloadSchema,
      payload,
      handler: async parsed => {
        const profile = await this.animeService.getUserProfile(parsed.username);
        return { profile };
      },
    });
  }
}
