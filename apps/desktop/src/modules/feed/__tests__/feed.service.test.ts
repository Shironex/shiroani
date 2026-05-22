/**
 * Unit tests for the FeedService orchestrator and the feed.types mappers.
 *
 * DatabaseService is stubbed with a prepare()-returning mock so we can assert
 * on SQL text and run() arguments without a real SQLite instance.
 */

import type { DatabaseService } from '../../database';
import type { FeedCacheService } from '../feed-cache.service';
import type { ArticleExtractorService } from '../article-extractor.service';
import type { ParsedFeedItem } from '../feed-parser.service';
import { FeedService } from '../feed.service';
import { rowToItem, rowToSource, type FeedItemRow, type FeedSourceRow } from '../feed.types';

function makeSourceRow(overrides: Partial<FeedSourceRow> = {}): FeedSourceRow {
  return {
    id: 1,
    name: 'Example Source',
    url: 'https://feed.example.com/rss',
    site_url: 'https://example.com',
    category: 'news',
    language: 'en',
    color: '#ff0066',
    icon: null,
    enabled: 1,
    poll_interval_minutes: 60,
    last_fetched_at: null,
    last_etag: null,
    consecutive_failures: 0,
    last_error: null,
    supports_full_content: 1,
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeItemRow(overrides: Partial<FeedItemRow> = {}): FeedItemRow {
  return {
    id: 100,
    feed_source_id: 1,
    guid: 'guid-1',
    title: 'Item Title',
    description: 'desc',
    content_html: null,
    url: 'https://example.com/post',
    author: 'Alice',
    image_url: 'https://example.com/img.jpg',
    published_at: '2024-01-01T00:00:00Z',
    categories: '["news","anime"]',
    content_hash: 'abc123',
    created_at: '2024-01-02T00:00:00Z',
    source_name: 'Example Source',
    source_color: '#ff0066',
    source_icon: null,
    source_category: 'news',
    source_language: 'en',
    source_supports_full_content: 1,
    ...overrides,
  };
}

function stubParsedItem(overrides: Partial<ParsedFeedItem> = {}): ParsedFeedItem {
  return {
    guid: 'g1',
    title: 'Title',
    description: 'desc',
    contentHtml: null,
    url: 'https://example.com/post',
    author: 'Alice',
    imageUrl: null,
    publishedAt: '2024-01-01T00:00:00Z',
    categories: null,
    contentHash: 'hash1',
    ...overrides,
  };
}

// ============================================
// Pure mapper tests (feed.types)
// ============================================

describe('rowToSource', () => {
  it('maps a fully populated source row', () => {
    const source = rowToSource(
      makeSourceRow({
        icon: '📰',
        enabled: 0,
        last_fetched_at: '2024-02-01T00:00:00Z',
        consecutive_failures: 3,
        last_error: 'timeout',
      })
    );
    expect(source).toEqual({
      id: 1,
      name: 'Example Source',
      url: 'https://feed.example.com/rss',
      siteUrl: 'https://example.com',
      category: 'news',
      language: 'en',
      color: '#ff0066',
      icon: '📰',
      enabled: false,
      pollIntervalMinutes: 60,
      lastFetchedAt: '2024-02-01T00:00:00Z',
      consecutiveFailures: 3,
      lastError: 'timeout',
      supportsFullContent: true,
    });
  });

  it('coerces SQLite 1/0 enabled to boolean', () => {
    expect(rowToSource(makeSourceRow({ enabled: 1 })).enabled).toBe(true);
    expect(rowToSource(makeSourceRow({ enabled: 0 })).enabled).toBe(false);
  });

  it('converts null optional fields to undefined', () => {
    const source = rowToSource(
      makeSourceRow({ icon: null, last_fetched_at: null, last_error: null })
    );
    expect(source.icon).toBeUndefined();
    expect(source.lastFetchedAt).toBeUndefined();
    expect(source.lastError).toBeUndefined();
  });
});

describe('rowToItem', () => {
  it('parses categories JSON into an array', () => {
    const item = rowToItem(makeItemRow({ categories: '["a","b"]' }));
    expect(item.categories).toEqual(['a', 'b']);
  });

  it('returns an empty array when categories column is null', () => {
    const item = rowToItem(makeItemRow({ categories: null }));
    expect(item.categories).toEqual([]);
  });

  it('falls back to defaults for missing joined source fields', () => {
    const item = rowToItem(
      makeItemRow({
        source_name: undefined,
        source_color: undefined,
        source_category: undefined,
        source_language: undefined,
      })
    );
    expect(item.sourceName).toBe('');
    expect(item.sourceColor).toBe('#666');
    expect(item.sourceCategory).toBe('news');
    expect(item.sourceLanguage).toBe('en');
  });

  it('converts null optional fields to undefined', () => {
    const item = rowToItem(
      makeItemRow({
        description: null,
        content_html: null,
        author: null,
        image_url: null,
        published_at: null,
        source_icon: null,
      })
    );
    expect(item.description).toBeUndefined();
    expect(item.contentHtml).toBeUndefined();
    expect(item.author).toBeUndefined();
    expect(item.imageUrl).toBeUndefined();
    expect(item.publishedAt).toBeUndefined();
    expect(item.sourceIcon).toBeUndefined();
  });

  it('maps a populated content_html column to contentHtml', () => {
    const item = rowToItem(makeItemRow({ content_html: '<p>Full body</p>' }));
    expect(item.contentHtml).toBe('<p>Full body</p>');
  });
});

// ============================================
// FeedService tests
// ============================================

interface Stmt {
  all: jest.Mock;
  get: jest.Mock;
  run: jest.Mock;
}

describe('FeedService', () => {
  let prepareCalls: Array<{ sql: string; stmt: Stmt }>;
  let db: { prepare: jest.Mock; transaction: jest.Mock };
  let dbService: Pick<DatabaseService, 'db'>;
  let cache: { fetch: jest.Mock };
  let extractor: { extract: jest.Mock };
  let service: FeedService;

  function addStmt(matcher: (sql: string) => boolean, stmt: Partial<Stmt> = {}): Stmt {
    const full: Stmt = {
      all: jest.fn(() => []),
      get: jest.fn(() => undefined),
      run: jest.fn(() => ({ changes: 1, lastInsertRowid: 1 })),
      ...stmt,
    };
    db.prepare.mockImplementation((sql: string) => {
      const normalized = sql.replace(/\s+/g, ' ').trim();
      if (matcher(normalized)) return full;
      // Default fallthrough — chain by re-delegating to any subsequent impls
      return {
        all: jest.fn(() => []),
        get: jest.fn(() => undefined),
        run: jest.fn(() => ({ changes: 0, lastInsertRowid: 0 })),
      };
    });
    return full;
  }

  beforeEach(() => {
    prepareCalls = [];
    db = {
      prepare: jest.fn((sql: string) => {
        const stmt: Stmt = {
          all: jest.fn(() => []),
          get: jest.fn(() => ({ count: 1 })), // non-zero by default so seed skips
          run: jest.fn(() => ({ changes: 1, lastInsertRowid: 1 })),
        };
        prepareCalls.push({ sql, stmt });
        return stmt;
      }),
      transaction: jest.fn((fn: () => void) => () => fn()),
    };
    dbService = { db } as unknown as Pick<DatabaseService, 'db'>;
    cache = { fetch: jest.fn().mockResolvedValue([]) };
    extractor = { extract: jest.fn().mockResolvedValue({ contentHtml: null }) };
    service = new FeedService(
      dbService as DatabaseService,
      cache as unknown as FeedCacheService,
      extractor as unknown as ArticleExtractorService
    );
  });

  describe('seedDefaultSources', () => {
    it('skips when the table already has rows', () => {
      // Default: get() returns { count: 1 }
      service.seedDefaultSources();
      const prepared = prepareCalls.map(c => c.sql);
      // Only the count query should have been prepared, not the insert.
      expect(prepared).toHaveLength(1);
      expect(prepared[0]).toContain('COUNT(*)');
    });

    it('inserts default sources when the table is empty', () => {
      const countStmt: Stmt = {
        all: jest.fn(),
        get: jest.fn(() => ({ count: 0 })),
        run: jest.fn(),
      };
      const insertStmt: Stmt = {
        all: jest.fn(),
        get: jest.fn(),
        run: jest.fn(() => ({ changes: 1, lastInsertRowid: 1 })),
      };

      db.prepare.mockReset();
      db.prepare.mockImplementation((sql: string) => {
        if (sql.includes('COUNT(*)')) return countStmt;
        if (sql.includes('INSERT INTO feed_sources')) return insertStmt;
        return { all: jest.fn(), get: jest.fn(), run: jest.fn() };
      });

      service.seedDefaultSources();
      expect(db.transaction).toHaveBeenCalled();
      expect(insertStmt.run).toHaveBeenCalled();
    });
  });

  describe('getAllSources', () => {
    it('selects ordered by category,name and maps rows', () => {
      const stmt = addStmt(
        sql => sql.includes('SELECT * FROM feed_sources ORDER BY category, name'),
        {
          all: jest.fn(() => [makeSourceRow({ id: 1 }), makeSourceRow({ id: 2 })]),
        }
      );
      const sources = service.getAllSources();
      expect(stmt.all).toHaveBeenCalled();
      expect(sources).toHaveLength(2);
      expect(sources[0]!.id).toBe(1);
    });
  });

  describe('toggleSource', () => {
    it('runs UPDATE with the correct 1/0 flag', () => {
      const stmt = addStmt(sql => sql.includes('UPDATE feed_sources SET enabled'));
      service.toggleSource(7, false);
      expect(stmt.run).toHaveBeenCalledWith(0, 7);
      service.toggleSource(7, true);
      expect(stmt.run).toHaveBeenCalledWith(1, 7);
    });
  });

  describe('getItems', () => {
    beforeEach(() => {
      db.prepare.mockReset();
      db.prepare.mockImplementation((sql: string) => {
        const s = sql.replace(/\s+/g, ' ');
        if (s.includes('SELECT COUNT(*)')) {
          return {
            all: jest.fn(),
            get: jest.fn(() => ({ total: 42 })),
            run: jest.fn(),
          };
        }
        return {
          all: jest.fn(() => [makeItemRow()]),
          get: jest.fn(),
          run: jest.fn(),
        };
      });
    });

    it('returns items + total + hasMore', () => {
      const result = service.getItems({ limit: 10, offset: 0 });
      expect(result.total).toBe(42);
      expect(result.hasMore).toBe(true);
      expect(result.items).toHaveLength(1);
    });

    it('filters by category when not "all"', () => {
      service.getItems({ category: 'news', limit: 10, offset: 0 });
      const calls = db.prepare.mock.calls.map(c => (c[0] as string).replace(/\s+/g, ' '));
      expect(calls.some(s => s.includes('fs.category = ?'))).toBe(true);
    });

    it('ignores category when "all"', () => {
      service.getItems({ category: 'all', limit: 10, offset: 0 });
      const calls = db.prepare.mock.calls.map(c => (c[0] as string).replace(/\s+/g, ' '));
      expect(calls.some(s => s.includes('fs.category = ?'))).toBe(false);
    });

    it('filters by language when not "all"', () => {
      service.getItems({ language: 'pl', limit: 10, offset: 0 });
      const calls = db.prepare.mock.calls.map(c => (c[0] as string).replace(/\s+/g, ' '));
      expect(calls.some(s => s.includes('fs.language = ?'))).toBe(true);
    });

    it('filters by sourceId when provided', () => {
      service.getItems({ sourceId: 7, limit: 10, offset: 0 });
      const calls = db.prepare.mock.calls.map(c => (c[0] as string).replace(/\s+/g, ' '));
      expect(calls.some(s => s.includes('fi.feed_source_id = ?'))).toBe(true);
    });

    it('clamps limit to [1,100] and offset to >=0', () => {
      const calls: Stmt[] = [];
      db.prepare.mockReset();
      db.prepare.mockImplementation((sql: string) => {
        const stmt: Stmt = {
          all: jest.fn(() => []),
          get: jest.fn(() => ({ total: 0 })),
          run: jest.fn(),
        };
        if (!sql.includes('COUNT(*)')) calls.push(stmt);
        return stmt;
      });

      service.getItems({ limit: 999, offset: -5 });
      expect(calls[0]!.all).toHaveBeenCalledWith(100, 0);

      service.getItems({ limit: 0, offset: 10 });
      expect(calls[1]!.all).toHaveBeenCalledWith(1, 10);
    });
  });

  describe('refreshAllFeeds', () => {
    it('dedupes concurrent calls by joining the in-flight promise', async () => {
      const sourcesStmt: Stmt = {
        all: jest.fn(() => [makeSourceRow({ id: 1 }), makeSourceRow({ id: 2 })]),
        get: jest.fn(),
        run: jest.fn(() => ({ changes: 0, lastInsertRowid: 0 })),
      };
      const genericStmt: Stmt = {
        all: jest.fn(() => []),
        get: jest.fn(),
        run: jest.fn(() => ({ changes: 0, lastInsertRowid: 0 })),
      };

      db.prepare.mockReset();
      db.prepare.mockImplementation((sql: string) => {
        if (sql.includes('FROM feed_sources WHERE enabled = 1')) return sourcesStmt;
        return genericStmt;
      });

      // Slow down cache.fetch so both calls overlap
      let resolve!: (v: ParsedFeedItem[]) => void;
      cache.fetch.mockReturnValueOnce(
        new Promise<ParsedFeedItem[]>(res => {
          resolve = res;
        })
      );
      cache.fetch.mockResolvedValue([]);

      const a = service.refreshAllFeeds();
      const b = service.refreshAllFeeds();

      expect(service.isFullRefreshInProgress()).toBe(true);

      resolve([]);
      const [ra, rb] = await Promise.all([a, b]);

      // Same promise resolves both; underlying sources query runs once.
      expect(ra).toBe(rb);
      expect(sourcesStmt.all).toHaveBeenCalledTimes(1);
      expect(service.isFullRefreshInProgress()).toBe(false);
    });
  });

  describe('fetchFeed', () => {
    it('inserts parsed items via cache.fetch and returns new count', async () => {
      cache.fetch.mockResolvedValueOnce([
        stubParsedItem({ guid: 'a', contentHash: 'h1', contentHtml: '<p>full body</p>' }),
        stubParsedItem({ guid: 'b', contentHash: 'h2' }),
      ]);

      let insertSql = '';
      const insertStmt: Stmt = {
        all: jest.fn(),
        get: jest.fn(),
        run: jest
          .fn()
          .mockReturnValueOnce({ changes: 1, lastInsertRowid: 1 })
          .mockReturnValueOnce({ changes: 0, lastInsertRowid: 0 }),
      };
      const successUpdate: Stmt = {
        all: jest.fn(),
        get: jest.fn(),
        run: jest.fn(() => ({ changes: 1, lastInsertRowid: 0 })),
      };

      db.prepare.mockReset();
      db.prepare.mockImplementation((sql: string) => {
        if (sql.includes('INSERT OR IGNORE INTO feed_items')) {
          insertSql = sql;
          return insertStmt;
        }
        if (sql.includes('consecutive_failures = 0')) return successUpdate;
        return { all: jest.fn(), get: jest.fn(), run: jest.fn() };
      });

      const source = makeSourceRow();
      const newCount = await service.fetchFeed(source);

      expect(cache.fetch).toHaveBeenCalledWith(source.url);
      expect(insertStmt.run).toHaveBeenCalledTimes(2);
      expect(successUpdate.run).toHaveBeenCalledWith(source.id);
      expect(newCount).toBe(1);
      // The INSERT must include the content_html column and forward the body.
      expect(insertSql).toContain('content_html');
      expect(insertStmt.run.mock.calls[0]).toContain('<p>full body</p>');
    });

    it('backfills content_html onto an existing item that has no stored body', async () => {
      cache.fetch.mockResolvedValueOnce([
        // Existing GUID (INSERT OR IGNORE → changes 0) that now carries a body.
        stubParsedItem({ guid: 'old', contentHash: 'h1', contentHtml: '<p>backfilled</p>' }),
      ]);

      const insertStmt: Stmt = {
        all: jest.fn(),
        get: jest.fn(),
        run: jest.fn(() => ({ changes: 0, lastInsertRowid: 0 })),
      };
      const backfillStmt: Stmt = {
        all: jest.fn(),
        get: jest.fn(),
        run: jest.fn(() => ({ changes: 1, lastInsertRowid: 0 })),
      };
      const successUpdate: Stmt = {
        all: jest.fn(),
        get: jest.fn(),
        run: jest.fn(() => ({ changes: 1, lastInsertRowid: 0 })),
      };

      db.prepare.mockReset();
      db.prepare.mockImplementation((sql: string) => {
        if (sql.includes('INSERT OR IGNORE INTO feed_items')) return insertStmt;
        if (sql.includes('content_html = ?') && sql.includes('content_html IS NULL'))
          return backfillStmt;
        if (sql.includes('consecutive_failures = 0')) return successUpdate;
        return { all: jest.fn(), get: jest.fn(), run: jest.fn() };
      });

      const source = makeSourceRow();
      const newCount = await service.fetchFeed(source);

      expect(newCount).toBe(0); // existing item is not counted as new
      expect(backfillStmt.run).toHaveBeenCalledWith('<p>backfilled</p>', source.id, 'old');
    });

    it('records a failure when cache.fetch throws', async () => {
      cache.fetch.mockRejectedValueOnce(new Error('network down'));

      const failureUpdate: Stmt = {
        all: jest.fn(),
        get: jest.fn(),
        run: jest.fn(() => ({ changes: 1, lastInsertRowid: 0 })),
      };

      db.prepare.mockReset();
      db.prepare.mockImplementation((sql: string) => {
        if (sql.includes('consecutive_failures = consecutive_failures + 1')) {
          return failureUpdate;
        }
        return { all: jest.fn(), get: jest.fn(), run: jest.fn() };
      });

      const source = makeSourceRow({ id: 9 });
      const newCount = await service.fetchFeed(source);

      expect(newCount).toBe(0);
      expect(failureUpdate.run).toHaveBeenCalledWith('network down', 9);
    });
  });

  describe('getArticleContent', () => {
    it('returns the stored content_html without re-extracting when present', async () => {
      const selectStmt: Stmt = {
        all: jest.fn(),
        get: jest.fn(() => ({ content_html: '<p>cached body</p>' })),
        run: jest.fn(),
      };
      db.prepare.mockReset();
      db.prepare.mockImplementation((sql: string) => {
        if (sql.includes('SELECT content_html FROM feed_items')) return selectStmt;
        return { all: jest.fn(), get: jest.fn(), run: jest.fn() };
      });

      const result = await service.getArticleContent('https://example.com/post');
      expect(result.contentHtml).toBe('<p>cached body</p>');
      expect(extractor.extract).not.toHaveBeenCalled();
    });

    it('extracts and persists the body when none is stored', async () => {
      extractor.extract.mockResolvedValueOnce({ contentHtml: '<p>extracted</p>' });

      const selectStmt: Stmt = {
        all: jest.fn(),
        get: jest.fn(() => undefined),
        run: jest.fn(),
      };
      const updateStmt: Stmt = {
        all: jest.fn(),
        get: jest.fn(),
        run: jest.fn(() => ({ changes: 1, lastInsertRowid: 0 })),
      };
      db.prepare.mockReset();
      db.prepare.mockImplementation((sql: string) => {
        if (sql.includes('SELECT content_html FROM feed_items')) return selectStmt;
        if (sql.includes('UPDATE feed_items SET content_html')) return updateStmt;
        return { all: jest.fn(), get: jest.fn(), run: jest.fn() };
      });

      const result = await service.getArticleContent('https://example.com/post');
      expect(extractor.extract).toHaveBeenCalledWith('https://example.com/post');
      expect(result.contentHtml).toBe('<p>extracted</p>');
      expect(updateStmt.run).toHaveBeenCalledWith('<p>extracted</p>', 'https://example.com/post');
    });

    it('returns null without persisting when extraction fails', async () => {
      extractor.extract.mockResolvedValueOnce({ contentHtml: null, error: 'host-not-allowed' });

      const selectStmt: Stmt = {
        all: jest.fn(),
        get: jest.fn(() => undefined),
        run: jest.fn(),
      };
      const updateStmt: Stmt = {
        all: jest.fn(),
        get: jest.fn(),
        run: jest.fn(),
      };
      db.prepare.mockReset();
      db.prepare.mockImplementation((sql: string) => {
        if (sql.includes('SELECT content_html FROM feed_items')) return selectStmt;
        if (sql.includes('UPDATE feed_items SET content_html')) return updateStmt;
        return { all: jest.fn(), get: jest.fn(), run: jest.fn() };
      });

      const result = await service.getArticleContent('https://blocked.example.com/post');
      expect(result.contentHtml).toBeNull();
      expect(updateStmt.run).not.toHaveBeenCalled();
    });

    it('skips extraction for sources with supports_full_content = 0', async () => {
      const noStored: Stmt = { all: jest.fn(), get: jest.fn(() => undefined), run: jest.fn() };
      const flagStmt: Stmt = { all: jest.fn(), get: jest.fn(() => ({ flag: 0 })), run: jest.fn() };
      db.prepare.mockReset();
      db.prepare.mockImplementation((sql: string) => {
        if (sql.includes('SELECT content_html FROM feed_items')) return noStored;
        if (sql.includes('supports_full_content')) return flagStmt;
        return { all: jest.fn(), get: jest.fn(), run: jest.fn() };
      });

      const result = await service.getArticleContent('https://www.animenewsnetwork.com/x');
      expect(result.contentHtml).toBeNull();
      expect(result.error).toBe('extraction-disabled');
      expect(extractor.extract).not.toHaveBeenCalled();
    });
  });
});
