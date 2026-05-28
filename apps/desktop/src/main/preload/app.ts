import { ipcRenderer } from 'electron';
import type { ElectronAPI, SystemInfoSnapshot } from '@shiroani/shared';

export const appApi: ElectronAPI['app'] = {
  getPath: (name: string) => ipcRenderer.invoke('app:get-path', name),
  getVersion: () => ipcRenderer.invoke('app:get-version'),
  getSystemInfo: () => ipcRenderer.invoke('app:get-system-info') as Promise<SystemInfoSnapshot>,
  getBackendPort: () => ipcRenderer.invoke('app:get-backend-port') as Promise<number>,
  clipboardWrite: (text: string) => ipcRenderer.invoke('app:clipboard-write', text),
  clipboardWriteImage: (pngBase64: string) =>
    ipcRenderer.invoke('app:clipboard-write-image', pngBase64) as Promise<void>,
  saveFileBinary: (filePath: string, base64Data: string) =>
    ipcRenderer.invoke('app:save-file-binary', filePath, base64Data) as Promise<{
      success: boolean;
    }>,
  fetchImageBase64: (url: string) =>
    ipcRenderer.invoke('app:fetch-image-base64', url) as Promise<string | null>,
  openLogsFolder: () => ipcRenderer.invoke('app:open-logs-folder') as Promise<void>,
  listLogFiles: () => ipcRenderer.invoke('app:list-log-files'),
  readLogFile: (fileName: string) => ipcRenderer.invoke('app:read-log-file', fileName),
  getAutoLaunch: () => ipcRenderer.invoke('app:get-auto-launch') as Promise<boolean>,
  setAutoLaunch: (enabled: boolean) =>
    ipcRenderer.invoke('app:set-auto-launch', enabled) as Promise<boolean>,
  setLogLevel: (level: string) =>
    ipcRenderer.invoke('app:set-log-level', { level }) as Promise<{ ok: boolean; level: string }>,
  relaunch: () => ipcRenderer.invoke('app:relaunch') as Promise<void>,
  clearUserFiles: () => ipcRenderer.invoke('app:clear-user-files') as Promise<void>,
};
