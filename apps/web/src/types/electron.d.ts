import type { ElectronAPI } from '@shiroani/shared';

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
