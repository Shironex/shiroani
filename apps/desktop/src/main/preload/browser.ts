import { ipcRenderer } from 'electron';
import type { ElectronAPI } from '@shiroani/shared';
import { createIpcListener } from './_shared';

export const browserApi: ElectronAPI['browser'] = {
  toggleAdblock: (enabled: boolean) =>
    ipcRenderer.invoke('browser:toggle-adblock', enabled) as Promise<void>,
  setFullscreen: (isFullscreen: boolean) =>
    ipcRenderer.invoke('browser:set-fullscreen', isFullscreen) as Promise<void>,
  getPopupBlockEnabled: () =>
    ipcRenderer.invoke('browser:get-popup-block-enabled') as Promise<boolean>,
  setPopupBlockEnabled: (enabled: boolean) =>
    ipcRenderer.invoke('browser:set-popup-block-enabled', enabled) as Promise<void>,
  setAdblockWhitelist: (hosts: string[]) =>
    ipcRenderer.invoke('browser:set-adblock-whitelist', hosts) as Promise<void>,
  clearSession: () => ipcRenderer.invoke('browser:clear-session') as Promise<void>,
  onNewWindowRequest: createIpcListener<string>('browser:new-window-request'),
  onShortcut: createIpcListener<{ key: string; ctrl?: boolean; shift?: boolean; alt?: boolean }>(
    'browser:shortcut'
  ),
};
