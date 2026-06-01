import { BrowserWindow } from 'electron';
import {
  registerWindowHandlers,
  cleanupWindowHandlers,
  registerDialogHandlers,
  cleanupDialogHandlers,
  registerStoreHandlers,
  cleanupStoreHandlers,
  registerAppHandlers,
  cleanupAppHandlers,
  registerUpdaterHandlers,
  cleanupUpdaterHandlers,
  registerBrowserHandlers,
  cleanupBrowserHandlers,
  registerBackgroundHandlers,
  cleanupBackgroundHandlers,
  registerSpriteHandlers,
  cleanupSpriteHandlers,
  registerNotificationHandlers,
  cleanupNotificationHandlers,
  registerFileHandlers,
  cleanupFileHandlers,
  registerOverlayHandlers,
  cleanupOverlayHandlers,
  registerDiscordRpcHandlers,
  cleanupDiscordRpcHandlers,
  registerAppStatsHandlers,
  cleanupAppStatsHandlers,
  registerAniListAuthHandlers,
  cleanupAniListAuthHandlers,
} from './';
import { BrowserManager } from '../browser/browser-manager';

/**
 * Register all IPC handlers for the application
 */
export function registerIpcHandlers(
  mainWindow: BrowserWindow,
  browserManager: BrowserManager
): void {
  registerWindowHandlers(mainWindow);
  registerDialogHandlers(mainWindow);
  registerStoreHandlers();
  registerAppHandlers();
  registerUpdaterHandlers();
  registerBrowserHandlers(mainWindow, browserManager);
  registerBackgroundHandlers(mainWindow);
  registerSpriteHandlers(mainWindow);
  registerNotificationHandlers();
  registerFileHandlers();
  registerOverlayHandlers();
  registerDiscordRpcHandlers();
  registerAppStatsHandlers();
  registerAniListAuthHandlers();
}

/**
 * Clean up IPC handlers (call on app quit)
 */
export function cleanupIpcHandlers(): void {
  cleanupWindowHandlers();
  cleanupDialogHandlers();
  cleanupStoreHandlers();
  cleanupAppHandlers();
  cleanupUpdaterHandlers();
  cleanupBrowserHandlers();
  cleanupBackgroundHandlers();
  cleanupSpriteHandlers();
  cleanupNotificationHandlers();
  cleanupFileHandlers();
  cleanupOverlayHandlers();
  cleanupDiscordRpcHandlers();
  cleanupAppStatsHandlers();
  cleanupAniListAuthHandlers();
}
