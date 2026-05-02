import { ipcRenderer } from 'electron';
import type {
  ElectronAPI,
  UpdateInfo,
  UpdateDownloadProgress,
  UpdateChannel,
  UpdateAwaitingArtifactsInfo,
} from '@shiroani/shared';
import { createIpcListener } from './_shared';

export const updaterApi: ElectronAPI['updater'] = {
  checkForUpdates: () => ipcRenderer.invoke('updater:check-for-updates'),
  startDownload: () => ipcRenderer.invoke('updater:start-download'),
  installNow: () => ipcRenderer.invoke('updater:install-now'),
  getChannel: () => ipcRenderer.invoke('updater:get-channel'),
  setChannel: (channel: UpdateChannel) => ipcRenderer.invoke('updater:set-channel', channel),
  onCheckingForUpdate: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('updater:checking-for-update', listener);
    return () => {
      ipcRenderer.removeListener('updater:checking-for-update', listener);
    };
  },
  onUpdateAvailable: createIpcListener<UpdateInfo>('updater:update-available'),
  onUpdateNotAvailable: createIpcListener<UpdateInfo>('updater:update-not-available'),
  onDownloadProgress: createIpcListener<UpdateDownloadProgress>('updater:download-progress'),
  onUpdateDownloaded: createIpcListener<UpdateInfo>('updater:update-downloaded'),
  onUpdateError: createIpcListener<string>('updater:error'),
  onChannelChanged: createIpcListener<UpdateChannel>('updater:channel-changed'),
  onAwaitingArtifacts: createIpcListener<UpdateAwaitingArtifactsInfo>('updater:awaiting-artifacts'),
};
