import type { BrowserWindow } from 'electron';
import type { NotificationSettings, NotificationSubscription } from '@shiroani/shared';
import type { NotificationsService } from '../../modules/notifications';
import type { ElectronNotificationHost } from './notification-host.adapter';
import { createMainLogger } from '../logging/logger';

const logger = createMainLogger('NotificationService');

/**
 * Thin host-side wrapper around `NotificationsService`.
 *
 * All scheduling, persistence, and dispatch logic lives inside the service; this
 * file exists only to bind the Electron-owned main window to the adapter and to
 * provide a stable import surface for the IPC handlers.
 */
let notificationsService: NotificationsService | null = null;
let electronHost: ElectronNotificationHost | null = null;

function requireService(): NotificationsService {
  if (!notificationsService) {
    throw new Error('NotificationsService is not initialized');
  }
  return notificationsService;
}

/**
 * Make the service reachable from the IPC handlers. Called right after the
 * backend is built, so `notifications:*` calls work from the first page load.
 */
export function bindNotificationService(
  service: NotificationsService,
  host: ElectronNotificationHost
): void {
  notificationsService = service;
  electronHost = host;
}

/**
 * Point click routing at the current main window and start the service. Runs for
 * every window; `initialize()` only does its work the first time.
 */
export function attachNotificationWindow(mainWindow: BrowserWindow): void {
  if (!notificationsService) return;
  electronHost?.setTargetWindow(mainWindow);
  try {
    notificationsService.initialize();
  } catch (error) {
    logger.error('Failed to initialize NotificationsService:', error);
  }
}

export async function cleanupNotificationService(): Promise<void> {
  if (!notificationsService) return;
  try {
    await notificationsService.shutdown();
  } finally {
    electronHost?.setTargetWindow(null);
    electronHost = null;
    notificationsService = null;
  }
}

// ========================================
// IPC handler surface
// ========================================
//
// These re-exports preserve the call shape used by `ipc/notifications.ts` and
// its unit tests so nothing downstream has to change.

export function getNotificationSettings(): NotificationSettings {
  return requireService().getNotificationSettings();
}

export function updateNotificationSettings(
  updates: Partial<NotificationSettings>
): NotificationSettings {
  return requireService().updateNotificationSettings(updates);
}

export function getSubscriptions(): NotificationSubscription[] {
  return requireService().getSubscriptions();
}

export function addSubscription(
  subscription: NotificationSubscription
): NotificationSubscription[] {
  return requireService().addSubscription(subscription);
}

export function removeSubscription(anilistId: number): NotificationSubscription[] {
  return requireService().removeSubscription(anilistId);
}

export function toggleSubscription(anilistId: number): NotificationSubscription[] {
  return requireService().toggleSubscription(anilistId);
}

export function isSubscribed(anilistId: number): boolean {
  return requireService().isSubscribed(anilistId);
}
