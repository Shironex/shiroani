import { create } from 'zustand';
import { maybeDevtools } from '@/stores/utils/maybeDevtools';
import { createLogger, type AniListAuthStatus } from '@shiroani/shared';

const logger = createLogger('AniListAuthStore');

const DISCONNECTED: AniListAuthStatus = { connected: false };

interface AniListAuthState {
  status: AniListAuthStatus;
  loading: boolean;
  error: string | null;
}

interface AniListAuthActions {
  fetchStatus: () => Promise<void>;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

type AniListAuthStore = AniListAuthState & AniListAuthActions;

/**
 * When the renderer runs outside Electron (web fallback) the AniList bridge is
 * absent. Resolve to a stable "desktopOnly" error so the UI can explain the
 * feature is desktop-only instead of crashing.
 */
const DESKTOP_ONLY_ERROR = 'accounts:anilist.desktopOnly';

export const useAniListAuthStore = create<AniListAuthStore>()(
  maybeDevtools(
    set => ({
      // State
      status: DISCONNECTED,
      loading: false,
      error: null,

      // Actions
      fetchStatus: async () => {
        const bridge = window.electronAPI?.anilistAuth;
        if (!bridge) {
          set({ status: DISCONNECTED, error: DESKTOP_ONLY_ERROR }, undefined, 'anilist/noBridge');
          return;
        }
        set({ loading: true, error: null }, undefined, 'anilist/fetchStatus');
        try {
          const status = await bridge.getStatus();
          set({ status, loading: false }, undefined, 'anilist/statusLoaded');
        } catch (error) {
          logger.error('Failed to fetch AniList status:', error);
          set({ loading: false }, undefined, 'anilist/statusError');
        }
      },

      connect: async () => {
        const bridge = window.electronAPI?.anilistAuth;
        if (!bridge) {
          set({ error: DESKTOP_ONLY_ERROR }, undefined, 'anilist/connectNoBridge');
          return;
        }
        set({ loading: true, error: null }, undefined, 'anilist/connect');
        try {
          const status = await bridge.connect();
          set({ status, loading: false }, undefined, 'anilist/connected');
        } catch (error) {
          logger.error('Failed to connect to AniList:', error);
          set(
            { loading: false, error: 'accounts:anilist.connectError' },
            undefined,
            'anilist/connectError'
          );
        }
      },

      disconnect: async () => {
        const bridge = window.electronAPI?.anilistAuth;
        if (!bridge) {
          set({ error: DESKTOP_ONLY_ERROR }, undefined, 'anilist/disconnectNoBridge');
          return;
        }
        set({ loading: true, error: null }, undefined, 'anilist/disconnect');
        try {
          await bridge.disconnect();
          set({ status: DISCONNECTED, loading: false }, undefined, 'anilist/disconnected');
        } catch (error) {
          logger.error('Failed to disconnect from AniList:', error);
          set(
            { loading: false, error: 'accounts:anilist.disconnectError' },
            undefined,
            'anilist/disconnectError'
          );
        }
      },
    }),
    { name: 'anilistAuth' }
  )
);
