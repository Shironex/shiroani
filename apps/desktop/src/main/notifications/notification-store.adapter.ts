import type { AiringAnime, NotificationSettings } from '@shiroani/shared';
import { NotificationStorePort } from '../../modules/notifications/notification-store.port';
import { store } from '../store';

const STORE_KEY = 'notification-settings';
const SENT_STORE_KEY = 'notification-sent';
const SCHEDULE_CACHE_STORE_KEY = 'notification-cached-schedule';

/** electron-store implementation of `NotificationStorePort`. */
export class ElectronNotificationStore extends NotificationStorePort {
  loadSettings(): Partial<NotificationSettings> | undefined {
    return store.get(STORE_KEY) as Partial<NotificationSettings> | undefined;
  }

  saveSettings(settings: NotificationSettings): void {
    store.set(STORE_KEY, settings);
  }

  loadSentKeys(): string[] {
    const stored = store.get(SENT_STORE_KEY);
    return Array.isArray(stored) ? stored.filter((v): v is string => typeof v === 'string') : [];
  }

  saveSentKeys(keys: string[]): void {
    store.set(SENT_STORE_KEY, keys);
  }

  loadCachedSchedule(): AiringAnime[] {
    const stored = store.get(SCHEDULE_CACHE_STORE_KEY);
    return Array.isArray(stored) ? (stored as AiringAnime[]) : [];
  }

  saveCachedSchedule(schedule: AiringAnime[]): void {
    store.set(SCHEDULE_CACHE_STORE_KEY, schedule);
  }
}
