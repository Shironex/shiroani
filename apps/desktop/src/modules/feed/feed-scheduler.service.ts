import { createLogger } from '@shiroani/shared';
import { DatabaseService } from '../database';
import { FeedService } from './feed.service';
import type { FeedSourceRow } from './feed.types';

const logger = createLogger('FeedSchedulerService');

const DEFAULT_POLL_INTERVAL_MS = 60_000;

/**
 * Background polling timer for feed sources that are due for refresh.
 *
 * Runs on a fixed interval (default 60s) and refreshes any enabled source
 * whose `poll_interval_minutes` has elapsed since `last_fetched_at`. Defers
 * to {@link FeedService.isFullRefreshInProgress} so a manual "refresh all"
 * never overlaps with the due-poll.
 */
export class FeedSchedulerService {
  private pollingTimer: ReturnType<typeof setInterval> | null = null;
  private isPolling = false;

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly feedService: FeedService
  ) {
    logger.info('FeedSchedulerService initialized');
  }

  /** Stop polling for good during shutdown. */
  dispose(): void {
    this.stopPolling();
    logger.info('Feed polling fully torn down');
  }

  /** Start the background polling timer. Safe to call multiple times — subsequent calls reset the timer. */
  startPolling(intervalMs: number = DEFAULT_POLL_INTERVAL_MS): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
    }

    this.pollingTimer = setInterval(() => {
      void this.runPollCycle('feed poll');
    }, intervalMs);

    logger.info(`Feed polling started (${intervalMs}ms interval for previously fetched sources)`);
  }

  /** Stop the background polling timer. Idempotent. */
  stopPolling(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
    this.isPolling = false;
  }

  /** Run a single poll cycle, skipping if one is already in flight. */
  async runPollCycle(context: string = 'unknown'): Promise<void> {
    if (this.isPolling) {
      logger.debug(`[${context}] Poll already in progress, skipping`);
      return;
    }

    this.isPolling = true;
    try {
      await this.pollDueFeeds();
    } catch (error) {
      logger.error(`Error during ${context}:`, error);
    } finally {
      this.isPolling = false;
    }
  }

  /** Find sources that are due for a refresh and fetch them sequentially. */
  async pollDueFeeds(): Promise<void> {
    if (this.feedService.isFullRefreshInProgress()) {
      logger.debug('Skipping due-feed poll because a full refresh is already in progress');
      return;
    }

    const db = this.databaseService.db;

    const dueSources = db
      .prepare(
        `SELECT * FROM feed_sources
         WHERE enabled = 1
           AND (
             last_fetched_at IS NOT NULL
             AND (julianday('now') - julianday(last_fetched_at)) * 24 * 60 >= poll_interval_minutes
           )
         ORDER BY last_fetched_at ASC`
      )
      .all() as FeedSourceRow[];

    if (dueSources.length === 0) return;

    logger.debug(`${dueSources.length} feed source(s) due for refresh`);

    for (const source of dueSources) {
      try {
        await this.feedService.fetchFeed(source);
      } catch (error) {
        logger.error(`Error polling feed "${source.name}":`, error);
      }
    }
  }
}
