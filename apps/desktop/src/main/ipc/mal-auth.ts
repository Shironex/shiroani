import { ipcMain } from 'electron';
import type { MalAuthStatus, MalViewer } from '@shiroani/shared';
import { DEFAULT_MAL_CLIENT_ID } from '@shiroani/shared';
import { createMainLogger } from '../logging/logger';
import { startMalOAuth } from '../auth/mal-oauth';
import { fetchMalViewer } from '../auth/mal-viewer';
import { saveSession, clear, getStatus } from '../auth/mal-token-store';
import { handle, handleWithFallback } from './with-ipc-handler';

const logger = createMainLogger('IPC:MalAuth');

function resolveClientId(): string {
  return process.env.MAL_CLIENT_ID || DEFAULT_MAL_CLIENT_ID;
}

/** Optional client secret — present only for confidential clients. Main-side ONLY. */
function resolveClientSecret(): string | undefined {
  return process.env.MAL_CLIENT_SECRET || undefined;
}

/**
 * Register MAL OAuth IPC handlers.
 *
 * Neither the access token nor the refresh token EVER crosses IPC — handlers
 * only ever return a {@link MalAuthStatus}. Both tokens are held in the
 * main-process safeStorage-backed store. The client secret (when set) likewise
 * never leaves the main process.
 */
export function registerMalAuthHandlers(): void {
  handle('mal-auth:connect', async (): Promise<MalAuthStatus> => {
    const clientId = resolveClientId();
    if (!clientId) {
      throw new Error('MAL client ID is not configured (set MAL_CLIENT_ID). Cannot start OAuth.');
    }

    const { accessToken, refreshToken, expiresIn } = await startMalOAuth(
      clientId,
      resolveClientSecret()
    );

    // Fetch the viewer with the FRESH access token — the session is not saved
    // yet, so a store-backed read would return null here. The viewer is only
    // decoration (avatar/name in the UI); the token pair is the valuable
    // artifact. If the profile fetch fails, persist the tokens anyway with an
    // undefined viewer rather than throwing away a good, freshly-authorized
    // session. `MalViewer` is optional in both the status and the store.
    let viewer: MalViewer | undefined;
    try {
      viewer = await fetchMalViewer(accessToken);
    } catch (err) {
      logger.warn('MAL viewer fetch failed after connect; saving session without viewer', err);
    }

    saveSession({ accessToken, refreshToken }, expiresIn, viewer);
    logger.info('MAL account connected');
    return getStatus();
  });

  handle('mal-auth:disconnect', async (): Promise<void> => {
    clear();
    logger.info('MAL account disconnected');
  });

  handleWithFallback(
    'mal-auth:status',
    (): MalAuthStatus => getStatus(),
    () => ({ connected: false })
  );
}

/**
 * Clean up MAL OAuth IPC handlers.
 */
export function cleanupMalAuthHandlers(): void {
  ipcMain.removeHandler('mal-auth:connect');
  ipcMain.removeHandler('mal-auth:disconnect');
  ipcMain.removeHandler('mal-auth:status');
}
