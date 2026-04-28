import type { ElectronAPI } from '@shiroani/shared';

import { windowApi } from './window';
import { storeApi } from './store';
import { dialogApi } from './dialog';
import { fileApi } from './file';
import { backgroundApi } from './background';
import { appApi } from './app';
import { logApi } from './log';
import { browserApi } from './browser';
import { updaterApi } from './updater';
import { notificationsApi } from './notifications';
import { discordRpcApi } from './discord';
import { overlayApi } from './overlay';
import { ipcApi } from './ipc';
import { appStatsApi } from './app-stats';
import { playerSkipApi } from './player-skip';

/**
 * The single object passed to `contextBridge.exposeInMainWorld('electronAPI')`.
 * Each property is the API surface for one domain. Shape conformance is enforced
 * by the shared `ElectronAPI` type — preload and renderer compile against the
 * same contract.
 */
export const electronAPI: ElectronAPI = {
  window: windowApi,
  store: storeApi,
  dialog: dialogApi,
  file: fileApi,
  background: backgroundApi,
  app: appApi,
  log: logApi,
  browser: browserApi,
  updater: updaterApi,
  notifications: notificationsApi,
  discordRpc: discordRpcApi,
  overlay: overlayApi,
  ipc: ipcApi,
  appStats: appStatsApi,
  playerSkip: playerSkipApi,
  platform: process.platform,
};
