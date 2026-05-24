import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
} from '@nestjs/websockets';
import { UseGuards } from '@nestjs/common';
import { Server } from 'socket.io';
import {
  createLogger,
  FeedEvents,
  feedGetItemsPayloadSchema,
  feedToggleSourcePayloadSchema,
  feedGetArticlePayloadSchema,
} from '@shiroani/shared';
import { CORS_CONFIG } from '../kernel/cors.config';
import { WsThrottlerGuard } from '../kernel/ws-throttler.guard';
import { handleGatewayRequest } from '../kernel/gateway-handler';
import { FeedService } from './feed.service';

const logger = createLogger('FeedGateway');

@WebSocketGateway({ cors: CORS_CONFIG })
@UseGuards(WsThrottlerGuard)
export class FeedGateway {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly feedService: FeedService) {
    logger.info('FeedGateway initialized');
  }

  @SubscribeMessage(FeedEvents.GET_ITEMS)
  handleGetItems(@MessageBody() payload: unknown) {
    return handleGatewayRequest({
      logger,
      action: FeedEvents.GET_ITEMS,
      defaultResult: { items: [], total: 0, hasMore: false },
      schema: feedGetItemsPayloadSchema,
      payload,
      handler: async parsed => {
        return this.feedService.getItems(parsed);
      },
    });
  }

  @SubscribeMessage(FeedEvents.GET_SOURCES)
  handleGetSources() {
    return handleGatewayRequest({
      logger,
      action: FeedEvents.GET_SOURCES,
      defaultResult: { sources: [] },
      handler: async () => {
        const sources = this.feedService.getAllSources();
        return { sources };
      },
    });
  }

  @SubscribeMessage(FeedEvents.TOGGLE_SOURCE)
  handleToggleSource(@MessageBody() payload: unknown) {
    return handleGatewayRequest({
      logger,
      action: FeedEvents.TOGGLE_SOURCE,
      defaultResult: { sources: [] },
      schema: feedToggleSourcePayloadSchema,
      payload,
      handler: async parsed => {
        this.feedService.toggleSource(parsed.id, parsed.enabled);
        const sources = this.feedService.getAllSources();
        this.server.emit(FeedEvents.SOURCES_RESULT, { sources });
        return { sources };
      },
    });
  }

  @SubscribeMessage(FeedEvents.GET_ARTICLE)
  handleGetArticle(@MessageBody() payload: unknown) {
    return handleGatewayRequest({
      logger,
      action: FeedEvents.GET_ARTICLE,
      defaultResult: { contentHtml: null },
      schema: feedGetArticlePayloadSchema,
      payload,
      handler: async parsed => {
        return this.feedService.getArticleContent(parsed.url);
      },
    });
  }

  @SubscribeMessage(FeedEvents.REFRESH)
  handleRefresh() {
    logger.debug('feed:refresh — starting background refresh');

    // Fire-and-forget: return immediately so the client socket doesn't time out,
    // then broadcast NEW_ITEMS when all sources have been fetched.
    this.feedService
      .refreshAllFeeds()
      .then(newItemsCount => {
        this.server.emit(FeedEvents.NEW_ITEMS, { newItemsCount });
      })
      .catch(err => {
        logger.error('Background feed refresh failed:', err);
        this.server.emit(FeedEvents.NEW_ITEMS, { newItemsCount: 0 });
      });

    return { started: true };
  }
}
