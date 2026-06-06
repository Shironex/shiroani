import { ipcMain } from 'electron';
import type { AniListAuthStatus } from '@shiroani/shared';
import { DEFAULT_ANILIST_CLIENT_ID } from '@shiroani/shared';
import { AniListClient } from '../../modules/anime/anilist-client';
import { createMainLogger } from '../logging/logger';
import { startAniListOAuth } from '../auth/anilist-oauth';
import { saveSession, clear, getStatus } from '../auth/anilist-token-store';
import { handle, handleWithFallback } from './with-ipc-handler';

const logger = createMainLogger('IPC:AniListAuth');

function resolveClientId(): string {
  return process.env.ANILIST_CLIENT_ID || DEFAULT_ANILIST_CLIENT_ID;
}

/**
 * Register AniList OAuth IPC handlers.
 *
 * The access token NEVER crosses IPC — handlers only ever return an
 * {@link AniListAuthStatus}. The token is held in the main-process
 * safeStorage-backed store.
 */
export function registerAniListAuthHandlers(): void {
  handle('anilist-auth:connect', async (): Promise<AniListAuthStatus> => {
    const clientId = resolveClientId();
    if (!clientId) {
      throw new Error(
        'AniList client ID is not configured (set ANILIST_CLIENT_ID). Cannot start OAuth.'
      );
    }

    const { accessToken, expiresIn } = await startAniListOAuth(clientId);

    // Fetch the viewer with a client bound to the FRESH token — the session is
    // not saved yet, so a store-backed port would return null here.
    const client = new AniListClient({ getAccessToken: async () => accessToken });
    const viewer = await client.getViewer();

    saveSession(accessToken, expiresIn, viewer);
    logger.info('AniList account connected');
    return getStatus();
  });

  handle('anilist-auth:disconnect', async (): Promise<void> => {
    clear();
    logger.info('AniList account disconnected');
  });

  handleWithFallback(
    'anilist-auth:status',
    (): AniListAuthStatus => getStatus(),
    () => ({ connected: false })
  );
}

/**
 * Clean up AniList OAuth IPC handlers.
 */
export function cleanupAniListAuthHandlers(): void {
  ipcMain.removeHandler('anilist-auth:connect');
  ipcMain.removeHandler('anilist-auth:disconnect');
  ipcMain.removeHandler('anilist-auth:status');
}
