import { ipcRenderer } from 'electron';
import type { MalAuthStatus, ElectronAPI } from '@shiroani/shared';

/**
 * Renderer-facing MAL OAuth bridge. Neither token crosses this boundary — every
 * method resolves to a {@link MalAuthStatus} (or void). Mirrors the AniList
 * bridge.
 */
export const malAuthApi: ElectronAPI['malAuth'] = {
  connect: () => ipcRenderer.invoke('mal-auth:connect') as Promise<MalAuthStatus>,
  disconnect: () => ipcRenderer.invoke('mal-auth:disconnect') as Promise<void>,
  getStatus: () => ipcRenderer.invoke('mal-auth:status') as Promise<MalAuthStatus>,
};
