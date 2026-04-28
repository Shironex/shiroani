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
  registerPlayerSkipHandlers,
  cleanupPlayerSkipHandlers,
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
  registerNotificationHandlers();
  registerFileHandlers();
  registerOverlayHandlers();
  registerDiscordRpcHandlers();
  registerAppStatsHandlers();
  registerPlayerSkipHandlers();
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
  cleanupNotificationHandlers();
  cleanupFileHandlers();
  cleanupOverlayHandlers();
  cleanupDiscordRpcHandlers();
  cleanupAppStatsHandlers();
  cleanupPlayerSkipHandlers();
}
