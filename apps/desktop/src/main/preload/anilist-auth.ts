import { ipcRenderer } from 'electron';
import type { AniListAuthStatus, ElectronAPI } from '@shiroani/shared';

/**
 * Renderer-facing AniList OAuth bridge. The token NEVER crosses this boundary —
 * every method resolves to an {@link AniListAuthStatus} (or void).
 */
export const anilistAuthApi: ElectronAPI['anilistAuth'] = {
  connect: () => ipcRenderer.invoke('anilist-auth:connect') as Promise<AniListAuthStatus>,
  disconnect: () => ipcRenderer.invoke('anilist-auth:disconnect') as Promise<void>,
  getStatus: () => ipcRenderer.invoke('anilist-auth:status') as Promise<AniListAuthStatus>,
};
