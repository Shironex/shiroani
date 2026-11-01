import { createLogger, type BackendEventPublisher } from '@shiroani/shared';
import { safeCleanup } from './cleanup-utils';
import { ElectronAniListTokenAdapter } from './auth/anilist-token.adapter';
import { ElectronMalTokenAdapter } from './auth/mal-token.adapter';
import { ElectronNotificationHost } from './notifications/notification-host.adapter';
import { ElectronNotificationStore } from './notifications/notification-store.adapter';
import { AniListClient } from '../modules/anime/anilist-client';
import { MalClient } from '../modules/anime/mal-client';
import { AnimeService } from '../modules/anime/anime.service';
import { AnimeProfileService } from '../modules/anime/anime-profile.service';
import { AnimeSocialService } from '../modules/anime/anime-social.service';
import { AnimeRecommendationsService } from '../modules/anime/anime-recommendations.service';
import { AniListSyncService } from '../modules/anilist-sync/anilist-sync.service';
import { DatabaseService } from '../modules/database/database.service';
import { DiaryService } from '../modules/diary/diary.service';
import { ArticleExtractorService } from '../modules/feed/article-extractor.service';
import { FeedCacheService } from '../modules/feed/feed-cache.service';
import { FeedParserService } from '../modules/feed/feed-parser.service';
import { FeedSchedulerService } from '../modules/feed/feed-scheduler.service';
import { FeedService } from '../modules/feed/feed.service';
import { ImportExportService } from '../modules/import-export/import-export.service';
import { LibraryService } from '../modules/library/library.service';
import { MalSyncService } from '../modules/mal-sync/mal-sync.service';
import { NotificationsService } from '../modules/notifications/notifications.service';
import { ScheduleService } from '../modules/schedule/schedule.service';
import { createSystemHandlers, type BackendHandlers } from '../modules/kernel/backend-handlers';
import { InflightTracker } from '../modules/kernel/inflight-tracker';
import type { GatewayServices } from '../modules/app.module';

const logger = createLogger('Backend');

/** How long shutdown waits for running calls before closing the database. */
const SHUTDOWN_DRAIN_MS = 2_000;

export interface CreateBackendOptions {
  dbPath: string;
  events: BackendEventPublisher;
  /** Replaces the real database in tests, where the native module does not load. */
  createDatabase?: (dbPath: string) => DatabaseService;
}

export interface Backend extends GatewayServices {
  database: DatabaseService;
  notifications: NotificationsService;
  notificationHost: ElectronNotificationHost;
  events: BackendEventPublisher;
  handlers: BackendHandlers;
  inflight: InflightTracker;
  /** Register teardown work. Disposers run last-registered first. */
  addDisposer(name: string, dispose: () => void | Promise<void>): void;
  /** Run the disposers once. Later calls return the same promise. */
  shutdown(): Promise<void>;
}

/**
 * Composition root for the backend services. Synchronous, because opening the
 * database, migrating, seeding and starting the scheduler are all synchronous.
 * Must only run once per process: a second call would open a second database
 * handle and start a second scheduler.
 */
export function createBackend({
  dbPath,
  events,
  createDatabase = path => new DatabaseService(path),
}: CreateBackendOptions): Backend {
  const disposers: Array<{ name: string; dispose: () => void | Promise<void> }> = [];
  const addDisposer: Backend['addDisposer'] = (name, dispose) => {
    disposers.push({ name, dispose });
  };

  let shutdownPromise: Promise<void> | null = null;
  const shutdown = (): Promise<void> => {
    shutdownPromise ??= (async () => {
      while (disposers.length > 0) {
        const { name, dispose } = disposers.pop()!;
        await safeCleanup(name, dispose, logger);
      }
    })();
    return shutdownPromise;
  };

  try {
    const database = createDatabase(dbPath);
    database.init();
    addDisposer('database', () => database.dispose());

    const inflight = new InflightTracker();
    addDisposer('in-flight calls', () => inflight.drain(SHUTDOWN_DRAIN_MS));

    // One adapter per provider. The MAL one in particular must stay single: its
    // single-flight refresh guards against rotating the refresh token twice.
    const aniListTokens = new ElectronAniListTokenAdapter();
    const malTokens = new ElectronMalTokenAdapter();
    const notificationHost = new ElectronNotificationHost();
    const notificationStore = new ElectronNotificationStore();

    const aniListClient = new AniListClient(aniListTokens);
    const malClient = new MalClient(malTokens);
    const anime = new AnimeService(aniListClient);
    const animeProfile = new AnimeProfileService(aniListClient, malClient);
    const animeSocial = new AnimeSocialService(aniListClient);
    const animeRecommendations = new AnimeRecommendationsService(aniListClient);

    const library = new LibraryService(database);
    const diary = new DiaryService(database);
    const schedule = new ScheduleService(anime);
    const importExport = new ImportExportService(library, diary, database);

    const feedCache = new FeedCacheService(new FeedParserService());
    const feed = new FeedService(database, feedCache, new ArticleExtractorService());
    feed.seedDefaultSources();
    const feedScheduler = new FeedSchedulerService(database, feed);
    feedScheduler.startPolling();
    addDisposer('feed scheduler', () => feedScheduler.dispose());

    // The sync services get their own clients, so each keeps a separate response
    // cache as it always has. Collapsing them would change caching behaviour.
    const aniListSync = new AniListSyncService(
      new AniListClient(aniListTokens),
      library,
      aniListTokens
    );
    const malSync = new MalSyncService(
      new MalClient(malTokens),
      library,
      malTokens,
      new AniListClient(aniListTokens)
    );

    // Timers do not start here: the host calls `initialize()` once a window exists.
    const notifications = new NotificationsService(
      schedule,
      library,
      notificationHost,
      notificationStore
    );

    return {
      database,
      anime,
      animeProfile,
      animeSocial,
      animeRecommendations,
      library,
      diary,
      schedule,
      importExport,
      feed,
      aniListSync,
      malSync,
      notifications,
      notificationHost,
      events,
      handlers: { ...createSystemHandlers() },
      inflight,
      addDisposer,
      shutdown,
    };
  } catch (error) {
    void shutdown();
    throw error;
  }
}
