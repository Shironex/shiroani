// Types
export type { MessageDialogOptions } from './types';

// Window handlers
export { registerWindowHandlers, cleanupWindowHandlers } from './window';

// Dialog handlers
export { registerDialogHandlers, cleanupDialogHandlers } from './dialog';

// Store handlers
export { registerStoreHandlers, cleanupStoreHandlers } from './store';

// App handlers
export { registerAppHandlers, cleanupAppHandlers } from './app';

// Updater handlers
export { registerUpdaterHandlers, cleanupUpdaterHandlers } from './updater';

// Browser handlers
export { registerBrowserHandlers, cleanupBrowserHandlers } from './browser';

// Background handlers
export {
  registerBackgroundHandlers,
  cleanupBackgroundHandlers,
  registerBackgroundProtocol,
} from './background';

// Notification handlers
export { registerNotificationHandlers, cleanupNotificationHandlers } from './notifications';

// File handlers
export { registerFileHandlers, cleanupFileHandlers } from './file';

// Overlay handlers
export { registerOverlayHandlers, cleanupOverlayHandlers } from './overlay';

// Discord RPC handlers
export { registerDiscordRpcHandlers, cleanupDiscordRpcHandlers } from './discord-rpc';

// App stats handlers
export { registerAppStatsHandlers, cleanupAppStatsHandlers } from './app-stats';

// Player skip handlers (POC)
export { registerPlayerSkipHandlers, cleanupPlayerSkipHandlers } from './player-skip';

// IPC infrastructure
export { handle, handleWithFallback, on } from './with-ipc-handler';
export {
  IpcError,
  isIpcError,
  LIBRARY_ERROR_CODES,
  ANIME_ERROR_CODES,
  VALIDATION_ERROR_CODES,
} from './errors';
