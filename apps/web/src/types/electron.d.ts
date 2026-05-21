import type { ElectronAPI } from '@shiroani/shared';

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
    __testSocket?: unknown;
  }
}

export {};
