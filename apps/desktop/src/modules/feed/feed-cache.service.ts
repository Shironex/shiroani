import { Injectable } from '@nestjs/common';
import { createLogger } from '@shiroani/shared';
import { FeedParserService, type ParsedFeedItem } from './feed-parser.service';
import { LruTtlCache } from '../kernel/lru-ttl-cache';

const logger = createLogger('FeedCacheService');

/**
 * Minimal in-memory TTL cache for parsed feeds.
 *
 * Wraps {@link FeedParserService.parse} with a per-URL TTL so repeated
 * refreshes of the same feed within the TTL window avoid a second HTTP round
 * trip. Bounded to 50 entries via LRU eviction.
 */
@Injectable()
export class FeedCacheService {
  private readonly cache = new LruTtlCache<string, ParsedFeedItem[]>(50, 60_000);

  constructor(private readonly parser: FeedParserService) {
    logger.info('FeedCacheService initialized');
  }

  /** Fetch a feed through the cache. Falls through to the parser on miss or expiry. */
  async fetch(feedUrl: string, ttlMs = 60_000): Promise<ParsedFeedItem[]> {
    const cached = this.cache.get(feedUrl);
    if (cached !== undefined) {
      return cached;
    }

    const items = await this.parser.parse(feedUrl);
    this.cache.set(feedUrl, items, ttlMs);
    return items;
  }

  /** Drop a single URL's cached entry. */
  invalidate(feedUrl: string): void {
    this.cache.delete(feedUrl);
  }

  /** Drop every cached entry. */
  invalidateAll(): void {
    this.cache.clear();
  }
}
