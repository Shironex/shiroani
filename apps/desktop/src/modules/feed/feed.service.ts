import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  createLogger,
  extractErrorMessage,
  DEFAULT_FEED_SOURCES,
  type FeedGetItemsPayload,
  type FeedGetItemsResult,
  type FeedGetArticleResult,
  type FeedSource,
} from '@shiroani/shared';
import { DatabaseService } from '../database';
import { FeedCacheService } from './feed-cache.service';
import { ArticleExtractorService } from './article-extractor.service';
import { rowToItem, rowToSource, type FeedItemRow, type FeedSourceRow } from './feed.types';

const logger = createLogger('FeedService');

// Re-export types/mappers so existing importers keep working.
export { rowToItem, rowToSource };
export type { FeedItemRow, FeedSourceRow };

@Injectable()
export class FeedService implements OnModuleInit {
  private refreshAllPromise: Promise<number> | null = null;

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly cache: FeedCacheService,
    private readonly articleExtractor: ArticleExtractorService
  ) {
    logger.info('FeedService initialized');
  }

  onModuleInit(): void {
    this.seedDefaultSources();
  }

  /** Seed default feed sources if the table is empty. */
  seedDefaultSources(): void {
    const db = this.databaseService.db;
    const count = db.prepare('SELECT COUNT(*) as count FROM feed_sources').get() as {
      count: number;
    };
    if (count.count > 0) {
      logger.debug('Feed sources already seeded, skipping');
      return;
    }
    const insert = db.prepare(
      `INSERT INTO feed_sources (name, url, site_url, category, language, color, icon, poll_interval_minutes, supports_full_content)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    db.transaction(() => {
      for (const s of DEFAULT_FEED_SOURCES) {
        insert.run(
          s.name,
          s.url,
          s.siteUrl,
          s.category,
          s.language,
          s.color,
          s.icon ?? null,
          s.pollIntervalMinutes,
          s.supportsFullContent === false ? 0 : 1
        );
      }
    })();
    logger.info(`Seeded ${DEFAULT_FEED_SOURCES.length} default feed sources`);
  }

  /** Get all feed sources. */
  getAllSources(): FeedSource[] {
    const db = this.databaseService.db;
    const rows = db
      .prepare('SELECT * FROM feed_sources ORDER BY category, name')
      .all() as FeedSourceRow[];
    return rows.map(rowToSource);
  }

  /** Toggle a feed source's enabled state. */
  toggleSource(id: number, enabled: boolean): void {
    const db = this.databaseService.db;
    db.prepare('UPDATE feed_sources SET enabled = ? WHERE id = ?').run(enabled ? 1 : 0, id);
    logger.info(`Source id=${id} ${enabled ? 'enabled' : 'disabled'}`);
  }

  /** Get feed items with filtering and pagination. */
  getItems(payload: FeedGetItemsPayload): FeedGetItemsResult {
    const db = this.databaseService.db;
    const limit = Math.min(Math.max(Math.trunc(payload.limit ?? 50), 1), 100);
    const offset = Math.max(Math.trunc(payload.offset ?? 0), 0);
    const conditions: string[] = [];
    const params: (string | number)[] = [];
    if (payload.category && payload.category !== 'all') {
      conditions.push('fs.category = ?');
      params.push(payload.category);
    }
    if (payload.language && payload.language !== 'all') {
      conditions.push('fs.language = ?');
      params.push(payload.language);
    }
    if (payload.sourceId) {
      conditions.push('fi.feed_source_id = ?');
      params.push(payload.sourceId);
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const countRow = db
      .prepare(
        `SELECT COUNT(*) as total FROM feed_items fi
         JOIN feed_sources fs ON fi.feed_source_id = fs.id ${whereClause}`
      )
      .get(...params) as { total: number };
    // Project only the columns `rowToItem` reads — deliberately EXCLUDING
    // `fi.content_html` (a full article body up to 256KB/row) and `fi.content_hash`,
    // neither of which the list renders. The reader fetches the body separately
    // by URL via getArticleContent(), so a `SELECT fi.*` here would ship MBs of
    // unused HTML through SQLite + IPC on the default feed list.
    const rows = db
      .prepare(
        `SELECT fi.id, fi.feed_source_id, fi.guid, fi.title, fi.description, fi.url,
                fi.author, fi.image_url, fi.published_at, fi.categories, fi.created_at,
                fs.name as source_name, fs.color as source_color, fs.icon as source_icon,
                fs.category as source_category, fs.language as source_language,
                fs.supports_full_content as source_supports_full_content
         FROM feed_items fi
         JOIN feed_sources fs ON fi.feed_source_id = fs.id ${whereClause}
         ORDER BY fi.published_at DESC, fi.created_at DESC
         LIMIT ? OFFSET ?`
      )
      .all(...params, limit, offset) as FeedItemRow[];
    return {
      items: rows.map(rowToItem),
      total: countRow.total,
      hasMore: offset + limit < countRow.total,
    };
  }

  /**
   * Extract the full article body for a teaser-only item on demand.
   *
   * Delegates to the SSRF-guarded {@link ArticleExtractorService}. On success
   * the body is persisted back into the matching `feed_items.content_html` row
   * (keyed by URL) so subsequent opens are instant and offline-readable. Always
   * resolves — failures return `{ contentHtml: null }` so the reader can fall
   * back to the teaser + CTA.
   */
  async getArticleContent(url: string): Promise<FeedGetArticleResult> {
    // If a body is already stored (Phase 1 feed body or a prior extraction),
    // return it without re-fetching the page.
    const db = this.databaseService.db;
    const existing = db
      .prepare('SELECT content_html FROM feed_items WHERE url = ? AND content_html IS NOT NULL')
      .get(url) as { content_html: string } | undefined;
    if (existing?.content_html) {
      return { contentHtml: existing.content_html };
    }

    // Respect the source's extraction flag: sources whose pages extract poorly
    // (SPA, navigation/archive bleed) or have no body are not scraped on demand —
    // the reader falls back to the teaser + CTA.
    const source = db
      .prepare(
        `SELECT fs.supports_full_content AS flag
         FROM feed_items fi JOIN feed_sources fs ON fi.feed_source_id = fs.id
         WHERE fi.url = ? LIMIT 1`
      )
      .get(url) as { flag: number } | undefined;
    if (source && source.flag === 0) {
      return { contentHtml: null, error: 'extraction-disabled' };
    }

    const result = await this.articleExtractor.extract(url);
    if (result.contentHtml) {
      try {
        db.prepare('UPDATE feed_items SET content_html = ? WHERE url = ?').run(
          result.contentHtml,
          url
        );
      } catch (error) {
        logger.warn(
          `Failed to persist extracted article for ${url}: ${extractErrorMessage(error, 'unknown')}`
        );
      }
    }
    return result;
  }

  /** Refresh all enabled feeds. Returns the count of newly inserted items. */
  async refreshAllFeeds(): Promise<number> {
    if (this.refreshAllPromise) {
      logger.debug('Feed refresh already in progress, joining existing refresh');
      return this.refreshAllPromise;
    }
    this.refreshAllPromise = this.runRefreshAllFeeds();
    try {
      return await this.refreshAllPromise;
    } finally {
      this.refreshAllPromise = null;
    }
  }

  /** True while a `refreshAllFeeds()` call is in flight. Used by the scheduler to back off. */
  isFullRefreshInProgress(): boolean {
    return this.refreshAllPromise !== null;
  }

  private async runRefreshAllFeeds(): Promise<number> {
    const db = this.databaseService.db;
    const sources = db
      .prepare('SELECT * FROM feed_sources WHERE enabled = 1')
      .all() as FeedSourceRow[];
    logger.info(`Refreshing ${sources.length} enabled feed sources`);
    const results = await Promise.all(sources.map(source => this.fetchFeed(source)));
    const totalNew = results.reduce((sum, count) => sum + count, 0);
    logger.info(`Feed refresh complete: ${totalNew} new items`);
    return totalNew;
  }

  /** Fetch a single RSS feed, insert new items, return count of new items. */
  async fetchFeed(source: FeedSourceRow): Promise<number> {
    const db = this.databaseService.db;
    try {
      const parsedItems = await this.cache.fetch(source.url);
      const insert = db.prepare(
        `INSERT OR IGNORE INTO feed_items
          (feed_source_id, guid, title, description, content_html, url, author, image_url, published_at, categories, content_hash)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      // Backfill the full-article body onto items that predate the content_html
      // column (or were inserted before the source shipped one). Only fills when
      // the stored body is still NULL, so it never counts as a "new" item and
      // never clobbers an existing body.
      const backfill = db.prepare(
        `UPDATE feed_items SET content_html = ?
         WHERE feed_source_id = ? AND guid = ? AND content_html IS NULL`
      );
      let newCount = 0;
      const insertAll = db.transaction(() => {
        for (const item of parsedItems) {
          const result = insert.run(
            source.id,
            item.guid,
            item.title,
            item.description,
            item.contentHtml,
            item.url,
            item.author,
            item.imageUrl,
            item.publishedAt,
            item.categories,
            item.contentHash
          );
          if (result.changes > 0) {
            newCount++;
          } else if (item.contentHtml) {
            backfill.run(item.contentHtml, source.id, item.guid);
          }
        }
      });
      insertAll();
      db.prepare(
        `UPDATE feed_sources SET last_fetched_at = datetime('now'),
           consecutive_failures = 0, last_error = NULL WHERE id = ?`
      ).run(source.id);
      if (newCount > 0) logger.info(`Fetched ${newCount} new items from "${source.name}"`);
      else logger.debug(`No new items from "${source.name}"`);
      return newCount;
    } catch (error) {
      const errorMessage = extractErrorMessage(error, 'Unknown error');
      db.prepare(
        `UPDATE feed_sources SET last_fetched_at = datetime('now'),
           consecutive_failures = consecutive_failures + 1, last_error = ? WHERE id = ?`
      ).run(errorMessage, source.id);
      logger.warn(`Failed to fetch feed "${source.name}": ${errorMessage}`);
      return 0;
    }
  }
}
