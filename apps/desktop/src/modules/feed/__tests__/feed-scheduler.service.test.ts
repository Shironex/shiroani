/**
 * Unit tests for FeedSchedulerService.
 *
 * Uses fake timers and a minimal in-memory DB/FeedService double so we can
 * drive the polling loop deterministically without booting Nest.
 */

import type { DatabaseService } from '../../database';
import { FeedSchedulerService } from '../feed-scheduler.service';
import type { FeedService } from '../feed.service';
import type { FeedSourceRow } from '../feed.types';

function makeSource(overrides: Partial<FeedSourceRow> = {}): FeedSourceRow {
  return {
    id: 1,
    name: 'Source 1',
    url: 'https://feed.example.com/rss',
    site_url: 'https://example.com',
    category: 'news',
    language: 'en',
    color: '#000',
    icon: null,
    enabled: 1,
    poll_interval_minutes: 60,
    last_fetched_at: '2024-01-01T00:00:00Z',
    last_etag: null,
    consecutive_failures: 0,
    last_error: null,
    supports_full_content: 1,
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('FeedSchedulerService', () => {
  let dueSources: FeedSourceRow[];
  let allStmt: { all: jest.Mock };
  let db: { prepare: jest.Mock };
  let dbService: Pick<DatabaseService, 'db'>;
  let feedService: {
    fetchFeed: jest.Mock;
    isFullRefreshInProgress: jest.Mock;
  };
  let service: FeedSchedulerService;

  beforeEach(() => {
    jest.useFakeTimers();
    dueSources = [];
    allStmt = { all: jest.fn(() => dueSources) };
    db = { prepare: jest.fn(() => allStmt) };
    dbService = { db } as unknown as Pick<DatabaseService, 'db'>;
    feedService = {
      fetchFeed: jest.fn().mockResolvedValue(0),
      isFullRefreshInProgress: jest.fn().mockReturnValue(false),
    };
    service = new FeedSchedulerService(
      dbService as DatabaseService,
      feedService as unknown as FeedService
    );
  });

  afterEach(() => {
    service.stopPolling();
    jest.useRealTimers();
  });

  describe('startPolling / stopPolling', () => {
    it('startPolling schedules a repeating interval', async () => {
      dueSources = [makeSource()];
      service.startPolling(1_000);

      jest.advanceTimersByTime(1_000);
      await Promise.resolve();
      await Promise.resolve();

      expect(feedService.fetchFeed).toHaveBeenCalledTimes(1);
    });

    it('stopPolling prevents further ticks', async () => {
      dueSources = [makeSource()];
      service.startPolling(1_000);
      service.stopPolling();

      jest.advanceTimersByTime(10_000);
      await Promise.resolve();

      expect(feedService.fetchFeed).not.toHaveBeenCalled();
    });

    it('stopPolling is idempotent', () => {
      service.startPolling(1_000);
      expect(() => {
        service.stopPolling();
        service.stopPolling();
      }).not.toThrow();
    });

    it('calling startPolling twice resets the timer without leaking', async () => {
      service.startPolling(5_000);
      service.startPolling(1_000);
      dueSources = [makeSource()];

      jest.advanceTimersByTime(1_000);
      await Promise.resolve();
      await Promise.resolve();

      expect(feedService.fetchFeed).toHaveBeenCalledTimes(1);
    });
  });

  describe('runPollCycle', () => {
    it('skips when a cycle is already in flight', async () => {
      dueSources = [makeSource({ id: 1 })];
      let resolveFirst!: (v: number) => void;
      feedService.fetchFeed.mockReturnValueOnce(
        new Promise<number>(resolve => {
          resolveFirst = resolve;
        })
      );

      const first = service.runPollCycle('test1');
      const second = service.runPollCycle('test2');

      resolveFirst(0);
      await Promise.all([first, second]);

      expect(feedService.fetchFeed).toHaveBeenCalledTimes(1);
    });

    it('swallows errors from fetchFeed so the loop survives', async () => {
      dueSources = [makeSource({ id: 1 }), makeSource({ id: 2, name: 'Source 2' })];
      feedService.fetchFeed.mockRejectedValueOnce(new Error('network down'));
      feedService.fetchFeed.mockResolvedValueOnce(5);

      await expect(service.runPollCycle('test')).resolves.toBeUndefined();
      expect(feedService.fetchFeed).toHaveBeenCalledTimes(2);
    });
  });

  describe('pollDueFeeds', () => {
    it('returns early when a full refresh is in progress', async () => {
      feedService.isFullRefreshInProgress.mockReturnValue(true);
      dueSources = [makeSource()];

      await service.pollDueFeeds();

      expect(db.prepare).not.toHaveBeenCalled();
      expect(feedService.fetchFeed).not.toHaveBeenCalled();
    });

    it('returns early when no sources are due', async () => {
      dueSources = [];
      await service.pollDueFeeds();
      expect(db.prepare).toHaveBeenCalledTimes(1);
      expect(feedService.fetchFeed).not.toHaveBeenCalled();
    });

    it('fetches each due source in order', async () => {
      dueSources = [
        makeSource({ id: 1 }),
        makeSource({ id: 2, name: 'Source 2' }),
        makeSource({ id: 3, name: 'Source 3' }),
      ];

      await service.pollDueFeeds();

      expect(feedService.fetchFeed).toHaveBeenCalledTimes(3);
      expect(feedService.fetchFeed.mock.calls[0]![0]).toMatchObject({ id: 1 });
      expect(feedService.fetchFeed.mock.calls[1]![0]).toMatchObject({ id: 2 });
      expect(feedService.fetchFeed.mock.calls[2]![0]).toMatchObject({ id: 3 });
    });

    it('queries with a WHERE filter on enabled + poll_interval_minutes', async () => {
      dueSources = [];
      await service.pollDueFeeds();

      const sql = db.prepare.mock.calls[0]![0] as string;
      expect(sql).toContain('FROM feed_sources');
      expect(sql).toContain('enabled = 1');
      expect(sql).toContain('poll_interval_minutes');
      expect(sql).toContain('ORDER BY last_fetched_at ASC');
    });
  });

  describe('lifecycle hooks', () => {
    it('onModuleInit starts polling', () => {
      const startSpy = jest.spyOn(service, 'startPolling');
      service.onModuleInit();
      expect(startSpy).toHaveBeenCalled();
    });

    it('onModuleDestroy stops polling', () => {
      service.startPolling();
      const stopSpy = jest.spyOn(service, 'stopPolling');
      service.onModuleDestroy();
      expect(stopSpy).toHaveBeenCalled();
    });
  });
});
