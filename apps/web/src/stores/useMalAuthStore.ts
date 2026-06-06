import { create } from 'zustand';
import { maybeDevtools } from '@/stores/utils/maybeDevtools';
import { createLogger, type MalAuthStatus } from '@shiroani/shared';

const logger = createLogger('MalAuthStore');

const DISCONNECTED: MalAuthStatus = { connected: false };

interface MalAuthState {
  status: MalAuthStatus;
  loading: boolean;
  error: string | null;
}

interface MalAuthActions {
  fetchStatus: () => Promise<void>;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

type MalAuthStore = MalAuthState & MalAuthActions;

/**
 * When the renderer runs outside Electron (web fallback) the MAL bridge is
 * absent. Resolve to a stable "desktopOnly" error so the UI can explain the
 * feature is desktop-only instead of crashing.
 */
const DESKTOP_ONLY_ERROR = 'accounts:mal.desktopOnly';

/**
 * Detect the main-side "not configured" rejection.
 *
 * The MAL client ID lives in `process.env.MAL_CLIENT_ID` main-side only and is
 * never exposed to the renderer, so the connect rejection is the ONLY signal the
 * UI gets that credentials are absent (`getStatus` always returns
 * `{ connected: false }` in that case). The `mal-auth:connect` handler throws an
 * Error whose message contains "is not configured"; Electron preserves that
 * message across `invoke`. There is no structured error code on that channel
 * (and that file is not owned by this wave), so we match the message substring.
 * Coerced defensively because a rejection is not guaranteed to be a well-formed
 * Error.
 */
function isNotConfiguredError(error: unknown): boolean {
  const message = String((error as Error | undefined)?.message ?? error);
  return message.includes('not configured');
}

export const useMalAuthStore = create<MalAuthStore>()(
  maybeDevtools(
    set => ({
      // State
      status: DISCONNECTED,
      loading: false,
      error: null,

      // Actions
      fetchStatus: async () => {
        const bridge = window.electronAPI?.malAuth;
        if (!bridge) {
          set({ status: DISCONNECTED, error: DESKTOP_ONLY_ERROR }, undefined, 'mal/noBridge');
          return;
        }
        set({ loading: true, error: null }, undefined, 'mal/fetchStatus');
        try {
          const status = await bridge.getStatus();
          set({ status, loading: false }, undefined, 'mal/statusLoaded');
        } catch (error) {
          logger.error('Failed to fetch MAL status:', error);
          set({ loading: false }, undefined, 'mal/statusError');
        }
      },

      connect: async () => {
        const bridge = window.electronAPI?.malAuth;
        if (!bridge) {
          set({ error: DESKTOP_ONLY_ERROR }, undefined, 'mal/connectNoBridge');
          return;
        }
        set({ loading: true, error: null }, undefined, 'mal/connect');
        try {
          const status = await bridge.connect();
          set({ status, loading: false }, undefined, 'mal/connected');
        } catch (error) {
          logger.error('Failed to connect to MAL:', error);
          set(
            {
              loading: false,
              error: isNotConfiguredError(error)
                ? 'accounts:mal.notConfigured'
                : 'accounts:mal.connectError',
            },
            undefined,
            'mal/connectError'
          );
        }
      },

      disconnect: async () => {
        const bridge = window.electronAPI?.malAuth;
        if (!bridge) {
          set({ error: DESKTOP_ONLY_ERROR }, undefined, 'mal/disconnectNoBridge');
          return;
        }
        set({ loading: true, error: null }, undefined, 'mal/disconnect');
        try {
          await bridge.disconnect();
          set({ status: DISCONNECTED, loading: false }, undefined, 'mal/disconnected');
        } catch (error) {
          logger.error('Failed to disconnect from MAL:', error);
          set(
            { loading: false, error: 'accounts:mal.disconnectError' },
            undefined,
            'mal/disconnectError'
          );
        }
      },
    }),
    { name: 'malAuth' }
  )
);
