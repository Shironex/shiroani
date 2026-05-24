import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { getWeekStart, toLocalDate, createLogger } from '@shiroani/shared';
import type { AiringAnime, NotificationSettings, NotificationSubscription } from '@shiroani/shared';
import { ScheduleService } from '../schedule/schedule.service';
import { LibraryService } from '../library/library.service';
import { NotificationHostPort } from './notification-host.port';
import { NotificationStorePort } from './notification-store.port';
import {
  CHECK_INTERVAL_MS,
  SCHEDULE_CACHE_TTL_MS,
  isInQuietHours,
  shouldNotifyForAiring,
  pruneSentSet,
  mergeSettings,
  sanitizeSettingsUpdate,
  updateLastSeenTimestamps,
  pruneStaleSubscriptions,
} from './notification-logic';

const logger = createLogger('NotificationsService');

/**
 * Owns the in-app notification lifecycle: periodic airing checks, subscription
 * CRUD, settings persistence, and dispatch to the platform host. All I/O goes
 * through injected ports so this module stays Electron-free.
 */
@Injectable()
export class NotificationsService implements OnModuleDestroy {
  private checkInterval: ReturnType<typeof setInterval> | null = null;
  private initialTimeout: ReturnType<typeof setTimeout> | null = null;
  /** In-flight guard: prevents a slow check (awaiting the schedule fetch) from
   *  overlapping the next interval tick and double-firing the same toast. */
  private isChecking = false;
  private sentNotifications = new Set<string>();
  private cachedSchedule: AiringAnime[] | null = null;
  private cacheTimestamp = 0;
  private initialized = false;

  constructor(
    private readonly scheduleService: ScheduleService,
    private readonly libraryService: LibraryService,
    private readonly host: NotificationHostPort,
    private readonly store: NotificationStorePort
  ) {}

  // ========================================
  // Public API — called by host/IPC layer
  // ========================================

  /** Initialize persisted state and (if enabled) start the periodic check. */
  initialize(): void {
    if (this.initialized) return;
    this.initialized = true;

    this.loadSentNotifications();
    const loadedCount = this.sentNotifications.size;
    this.pruneSentNotifications();
    logger.info(
      `Loaded ${loadedCount} sent notification(s), ${this.sentNotifications.size} after pruning`
    );

    const settings = this.getSettings();

    const { kept, pruned } = pruneStaleSubscriptions(settings.subscriptions);
    if (pruned.length > 0) {
      settings.subscriptions = kept;
      this.saveSettings(settings);
      logger.info(
        `Pruned ${pruned.length} stale subscription(s): ${pruned.map(s => s.title).join(', ')}`
      );
    }

    this.host.clearScheduledToasts().catch(error => {
      logger.warn('Failed to clear scheduled toasts on init:', error);
    });
    this.host.logScheduledToastDiagnostics().catch(error => {
      logger.warn('Failed to log scheduled toast diagnostics:', error);
    });

    logger.info(
      `NotificationsService initialized (enabled: ${settings.enabled}, leadTime: ${settings.leadTimeMinutes}min, subscriptions: ${settings.subscriptions.length})`
    );

    if (settings.enabled) {
      this.startChecking();
    }
  }

  getNotificationSettings(): NotificationSettings {
    return this.getSettings();
  }

  updateNotificationSettings(updates: Partial<NotificationSettings>): NotificationSettings {
    const current = this.getSettings();
    const next = sanitizeSettingsUpdate(current, updates);
    this.saveSettings(next);

    if (next.enabled) {
      this.startChecking();
    } else {
      this.stopChecking();
    }

    logger.info(
      `Notification settings updated: enabled=${next.enabled}, leadTime=${next.leadTimeMinutes}min`
    );
    return next;
  }

  getSubscriptions(): NotificationSubscription[] {
    return this.getSettings().subscriptions;
  }

  addSubscription(subscription: NotificationSubscription): NotificationSubscription[] {
    const settings = this.getSettings();
    if (settings.subscriptions.some(s => s.anilistId === subscription.anilistId)) {
      logger.info(`Subscription already exists for anilistId=${subscription.anilistId}, skipping`);
      return settings.subscriptions;
    }
    settings.subscriptions.push(subscription);
    this.saveSettings(settings);
    logger.info(
      `Subscription added: "${subscription.title}" (anilistId=${subscription.anilistId})`
    );
    return settings.subscriptions;
  }

  removeSubscription(anilistId: number): NotificationSubscription[] {
    const settings = this.getSettings();
    const before = settings.subscriptions.length;
    settings.subscriptions = settings.subscriptions.filter(s => s.anilistId !== anilistId);
    this.saveSettings(settings);
    if (settings.subscriptions.length < before) {
      logger.info(`Subscription removed: anilistId=${anilistId}`);
    } else {
      logger.warn(`Subscription not found for removal: anilistId=${anilistId}`);
    }
    return settings.subscriptions;
  }

  toggleSubscription(anilistId: number): NotificationSubscription[] {
    const settings = this.getSettings();
    const sub = settings.subscriptions.find(s => s.anilistId === anilistId);
    if (sub) {
      sub.enabled = !sub.enabled;
      this.saveSettings(settings);
      logger.info(`Subscription toggled: anilistId=${anilistId}, enabled=${sub.enabled}`);
    } else {
      logger.warn(`Subscription not found for toggle: anilistId=${anilistId}`);
    }
    return settings.subscriptions;
  }

  isSubscribed(anilistId: number): boolean {
    return this.getSettings().subscriptions.some(s => s.anilistId === anilistId);
  }

  /**
   * Schedule any pending OS-level toasts and tear down timers. Called by the
   * Electron host during `before-quit`.
   */
  async shutdown(): Promise<void> {
    const settings = this.getSettings();
    if (settings.enabled) {
      try {
        const schedule = this.getScheduleForQuit();
        const notifyIds = this.getNotifyIds();
        await this.host.scheduleToastsOnQuit(schedule, settings, notifyIds, this.sentNotifications);
      } catch (error) {
        logger.warn('Failed to schedule host toasts on quit:', error);
      }
    }

    this.stopChecking();
    this.saveSentNotifications();
    this.cachedSchedule = null;
    this.initialized = false;
    logger.info('NotificationsService cleaned up');
  }

  onModuleDestroy(): void {
    this.stopChecking();
    this.saveSentNotifications();
  }

  // ========================================
  // Persistence helpers
  // ========================================

  private getSettings(): NotificationSettings {
    return mergeSettings(this.store.loadSettings());
  }

  private saveSettings(settings: NotificationSettings): void {
    this.store.saveSettings(settings);
  }

  private loadSentNotifications(): void {
    this.sentNotifications = new Set(this.store.loadSentKeys());
  }

  private saveSentNotifications(): void {
    this.store.saveSentKeys([...this.sentNotifications]);
  }

  private pruneSentNotifications(): void {
    this.sentNotifications = pruneSentSet(this.sentNotifications);
    this.saveSentNotifications();
  }

  private getScheduleForQuit(): AiringAnime[] {
    if (this.cachedSchedule) return this.cachedSchedule;
    return this.store.loadCachedSchedule();
  }

  private getNotifyIds(): Set<number> {
    const ids = new Set<number>();
    for (const entry of this.libraryService.getAllEntries('watching')) {
      if (entry.anilistId) ids.add(entry.anilistId);
    }
    const settings = this.getSettings();
    for (const sub of settings.subscriptions) {
      if (sub.enabled) ids.add(sub.anilistId);
    }
    return ids;
  }

  // ========================================
  // Periodic check
  // ========================================

  private startChecking(): void {
    this.stopChecking();
    const settings = this.getSettings();
    if (!settings.enabled) return;

    logger.info(
      `Starting notification checks (every ${CHECK_INTERVAL_MS / 1000}s, lead time: ${settings.leadTimeMinutes}min)`
    );

    this.initialTimeout = setTimeout(() => {
      this.initialTimeout = null;
      this.checkAndNotify().catch(error => {
        logger.error('Initial notification check failed:', error);
      });
    }, 10_000);

    this.checkInterval = setInterval(() => {
      this.checkAndNotify().catch(error => {
        logger.error('Periodic notification check failed:', error);
      });
    }, CHECK_INTERVAL_MS);
  }

  private stopChecking(): void {
    if (this.initialTimeout) {
      clearTimeout(this.initialTimeout);
      this.initialTimeout = null;
    }
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      logger.info('Notification checks stopped');
    }
  }

  private async getScheduleData(): Promise<AiringAnime[]> {
    const now = Date.now();
    if (this.cachedSchedule && now - this.cacheTimestamp < SCHEDULE_CACHE_TTL_MS) {
      return this.cachedSchedule;
    }

    try {
      const monday = toLocalDate(getWeekStart());
      const result = await this.scheduleService.getWeekly(monday);
      const allAiring: AiringAnime[] = [];
      for (const entries of Object.values(result.schedule)) {
        allAiring.push(...entries);
      }
      this.cachedSchedule = allAiring;
      this.cacheTimestamp = now;
      this.store.saveCachedSchedule(allAiring);
      logger.info(`Schedule cache refreshed: ${allAiring.length} airing entries`);
      return allAiring;
    } catch (error) {
      logger.error('Failed to fetch schedule for notifications:', error);
      return this.cachedSchedule ?? this.store.loadCachedSchedule();
    }
  }

  private async checkAndNotify(): Promise<void> {
    // Reentrancy guard — `getScheduleData()` awaits a network fetch, so without
    // this a slow run would overlap the next interval tick and both runs could
    // pass the dedupe check before either records the dispatch.
    if (this.isChecking) {
      logger.debug('Skipping notification check: a previous check is still running');
      return;
    }
    this.isChecking = true;
    try {
      await this.runCheck();
    } finally {
      this.isChecking = false;
    }
  }

  private async runCheck(): Promise<void> {
    const settings = this.getSettings();
    if (!settings.enabled) return;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    if (isInQuietHours(settings, currentMinutes)) {
      logger.info('Skipping notification check: quiet hours active');
      return;
    }

    const notifyIds = this.getNotifyIds();

    if (notifyIds.size === 0) {
      logger.info('Skipping notification check: no anime to monitor');
      return;
    }

    const airingData = await this.getScheduleData();

    const scheduleMediaIds = new Set(airingData.map(a => a.media.id));
    const updatedSubs = updateLastSeenTimestamps(settings.subscriptions, scheduleMediaIds);
    if (updatedSubs !== settings.subscriptions) {
      settings.subscriptions = updatedSubs;
      this.saveSettings(settings);
    }

    const nowUnix = Math.floor(Date.now() / 1000);
    const leadTimeSeconds = settings.leadTimeMinutes * 60;

    let dispatchCount = 0;
    for (const airing of airingData) {
      if (!notifyIds.has(airing.media.id)) continue;

      const timeUntilAiring = airing.airingAt - nowUnix;
      if (!shouldNotifyForAiring(timeUntilAiring, leadTimeSeconds)) continue;

      const dedupeKey = `${airing.media.id}:${airing.episode}`;
      if (this.sentNotifications.has(dedupeKey)) continue;

      dispatchCount++;
      // Reserve the dedupe key synchronously (before the async dispatch) so the
      // initial-timeout/first-interval pair can't both pass the has() check;
      // release it if the dispatch fails so a retry can fire later.
      this.sentNotifications.add(dedupeKey);
      this.host.showAiringNotification(airing, settings).catch(error => {
        this.sentNotifications.delete(dedupeKey);
        logger.warn(`Failed to dispatch notification for ${dedupeKey}:`, error);
      });
    }

    if (dispatchCount > 0) {
      logger.info(`Notification check complete: ${dispatchCount} notification(s) dispatched`);
    }

    this.sentNotifications = pruneSentSet(this.sentNotifications);
    this.saveSentNotifications();
  }
}
