import { ipcRenderer } from 'electron';
import type { ElectronAPI, ImageBytesUploadResult } from '@shiroani/shared';

export const backgroundApi: ElectronAPI['background'] = {
  pick: () =>
    ipcRenderer.invoke('background:pick') as Promise<{ fileName: string; url: string } | null>,
  remove: (fileName: string) => ipcRenderer.invoke('background:remove', fileName) as Promise<void>,
  getUrl: (fileName: string) =>
    ipcRenderer.invoke('background:get-url', fileName) as Promise<string | null>,
  addFromBytes: (bytes: Uint8Array) =>
    ipcRenderer.invoke('background:add-from-bytes', bytes) as Promise<ImageBytesUploadResult>,
};
