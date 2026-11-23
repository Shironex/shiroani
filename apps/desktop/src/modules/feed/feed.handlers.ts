import {
  createLogger,
  FeedEvents,
  feedGetArticlePayloadSchema,
  feedGetItemsPayloadSchema,
  feedMarkReadPayloadSchema,
  feedSetLastVisitedPayloadSchema,
  feedToggleSourcePayloadSchema,
  type BackendEventPublisher,
} from '@shiroani/shared';
import type { BackendHandlers } from '../kernel/backend-handlers';
import { handleGatewayRequest } from '../kernel/gateway-handler';
import type { InflightTracker } from '../kernel/inflight-tracker';
import type { FeedService } from './feed.service';

const logger = createLogger('FeedHandlers');

type FeedHandlers = Pick<
  BackendHandlers,
  | typeof FeedEvents.GET_ITEMS
  | typeof FeedEvents.GET_SOURCES
  | typeof FeedEvents.TOGGLE_SOURCE
  | typeof FeedEvents.GET_ARTICLE
  | typeof FeedEvents.MARK_READ
  | typeof FeedEvents.GET_READ_IDS
  | typeof FeedEvents.SET_LAST_VISITED
  | typeof FeedEvents.GET_LAST_VISITED
  | typeof FeedEvents.REFRESH
>;

export function createFeedHandlers(
  feed: FeedService,
  events: BackendEventPublisher,
  inflight: Pick<InflightTracker, 'track'>
): FeedHandlers {
  return {
    [FeedEvents.GET_ITEMS]: payload =>
      handleGatewayRequest({
        logger,
        action: FeedEvents.GET_ITEMS,
        defaultResult: { items: [], total: 0, hasMore: false },
        schema: feedGetItemsPayloadSchema,
        payload,
        handler: async parsed => feed.getItems(parsed),
      }),

    [FeedEvents.GET_SOURCES]: () =>
      handleGatewayRequest({
        logger,
        action: FeedEvents.GET_SOURCES,
        defaultResult: { sources: [] },
        handler: async () => ({ sources: feed.getAllSources() }),
      }),

    [FeedEvents.TOGGLE_SOURCE]: payload =>
      handleGatewayRequest({
        logger,
        action: FeedEvents.TOGGLE_SOURCE,
        defaultResult: { sources: [] },
        schema: feedToggleSourcePayloadSchema,
        payload,
        handler: async parsed => {
          feed.toggleSource(parsed.id, parsed.enabled);
          const sources = feed.getAllSources();
          events.emit(FeedEvents.SOURCES_RESULT, { sources });
          return { sources };
        },
      }),

    [FeedEvents.GET_ARTICLE]: payload =>
      handleGatewayRequest({
        logger,
        action: FeedEvents.GET_ARTICLE,
        defaultResult: { contentHtml: null },
        schema: feedGetArticlePayloadSchema,
        payload,
        handler: parsed => feed.getArticleContent(parsed.url),
      }),

    [FeedEvents.MARK_READ]: payload =>
      handleGatewayRequest({
        logger,
        action: FeedEvents.MARK_READ,
        defaultResult: { ok: false },
        schema: feedMarkReadPayloadSchema,
        payload,
        handler: async parsed => {
          feed.markRead(parsed.ids);
          return { ok: true };
        },
      }),

    [FeedEvents.GET_READ_IDS]: () =>
      handleGatewayRequest({
        logger,
        action: FeedEvents.GET_READ_IDS,
        defaultResult: { ids: [] },
        handler: async () => ({ ids: feed.getReadIds() }),
      }),

    [FeedEvents.SET_LAST_VISITED]: payload =>
      handleGatewayRequest({
        logger,
        action: FeedEvents.SET_LAST_VISITED,
        defaultResult: { ok: false },
        schema: feedSetLastVisitedPayloadSchema,
        payload,
        handler: async parsed => {
          feed.setLastVisited(parsed.lastVisitedAt);
          return { ok: true };
        },
      }),

    [FeedEvents.GET_LAST_VISITED]: () =>
      handleGatewayRequest({
        logger,
        action: FeedEvents.GET_LAST_VISITED,
        defaultResult: { lastVisitedAt: null },
        handler: async () => ({ lastVisitedAt: feed.getLastVisited() }),
      }),

    // Answers at once and reports through NEW_ITEMS when the sources are done, so
    // the request cannot time out. Tracked so shutdown can wait for the database
    // writes, though the wait is bounded.
    [FeedEvents.REFRESH]: async () => {
      void inflight.track(
        feed
          .refreshAllFeeds()
          .then(newItemsCount => {
            events.emit(FeedEvents.NEW_ITEMS, { newItemsCount });
          })
          .catch(err => {
            logger.error('Background feed refresh failed:', err);
            events.emit(FeedEvents.NEW_ITEMS, { newItemsCount: 0 });
          })
      );
      return { started: true };
    },
  };
}
