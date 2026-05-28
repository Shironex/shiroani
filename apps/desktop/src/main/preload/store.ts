import { ipcRenderer } from 'electron';
import type { ElectronAPI } from '@shiroani/shared';

export const storeApi: ElectronAPI['store'] = {
  get: <T>(key: string) => ipcRenderer.invoke('store:get', key) as Promise<T | undefined>,
  set: <T>(key: string, value: T) => ipcRenderer.invoke('store:set', key, value),
  delete: (key: string) => ipcRenderer.invoke('store:delete', key),
  clear: () => ipcRenderer.invoke('store:clear') as Promise<void>,
};
