import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { MalAuthStatus } from '@shiroani/shared';
import { useMalAuthStore } from '../useMalAuthStore';

const CONNECTED: MalAuthStatus = {
  connected: true,
  viewer: { id: 7, name: 'Anya', avatar: 'https://example.com/a.png' },
  expiresAt: 1_900_000_000_000,
};
const DISCONNECTED: MalAuthStatus = { connected: false };

function setBridge(bridge: unknown) {
  (window as unknown as { electronAPI?: unknown }).electronAPI = bridge
    ? { malAuth: bridge }
    : undefined;
}

function resetStore() {
  useMalAuthStore.setState({ status: DISCONNECTED, loading: false, error: null });
}

describe('useMalAuthStore', () => {
  beforeEach(() => {
    resetStore();
  });

  afterEach(() => {
    setBridge(undefined);
    vi.restoreAllMocks();
  });

  describe('fetchStatus', () => {
    it('loads connected status from the bridge', async () => {
      setBridge({ getStatus: vi.fn().mockResolvedValue(CONNECTED) });
      await useMalAuthStore.getState().fetchStatus();
      const s = useMalAuthStore.getState();
      expect(s.status).toEqual(CONNECTED);
      expect(s.loading).toBe(false);
      expect(s.error).toBeNull();
    });

    it('clears loading on bridge failure', async () => {
      setBridge({ getStatus: vi.fn().mockRejectedValue(new Error('boom')) });
      await useMalAuthStore.getState().fetchStatus();
      expect(useMalAuthStore.getState().loading).toBe(false);
    });

    it('sets desktopOnly error when electronAPI is absent (web fallback)', async () => {
      setBridge(undefined);
      await useMalAuthStore.getState().fetchStatus();
      const s = useMalAuthStore.getState();
      expect(s.status).toEqual(DISCONNECTED);
      expect(s.error).toBe('accounts:mal.desktopOnly');
    });
  });

  describe('connect', () => {
    it('stores the returned status on success', async () => {
      const connect = vi.fn().mockResolvedValue(CONNECTED);
      setBridge({ connect });
      await useMalAuthStore.getState().connect();
      const s = useMalAuthStore.getState();
      expect(connect).toHaveBeenCalledOnce();
      expect(s.status).toEqual(CONNECTED);
      expect(s.loading).toBe(false);
      expect(s.error).toBeNull();
    });

    it('sets connectError on generic failure', async () => {
      setBridge({ connect: vi.fn().mockRejectedValue(new Error('nope')) });
      await useMalAuthStore.getState().connect();
      const s = useMalAuthStore.getState();
      expect(s.loading).toBe(false);
      expect(s.error).toBe('accounts:mal.connectError');
    });

    it('maps the main-side "not configured" rejection to notConfigured', async () => {
      // The connect handler throws when MAL_CLIENT_ID is unset; Electron prefixes
      // the message but preserves "is not configured" across invoke.
      setBridge({
        connect: vi
          .fn()
          .mockRejectedValue(
            new Error(
              "Error invoking remote method 'mal-auth:connect': Error: MAL client ID is not configured (set MAL_CLIENT_ID). Cannot start OAuth."
            )
          ),
      });
      await useMalAuthStore.getState().connect();
      const s = useMalAuthStore.getState();
      expect(s.loading).toBe(false);
      expect(s.error).toBe('accounts:mal.notConfigured');
    });

    it('sets desktopOnly error with no bridge', async () => {
      setBridge(undefined);
      await useMalAuthStore.getState().connect();
      expect(useMalAuthStore.getState().error).toBe('accounts:mal.desktopOnly');
    });
  });

  describe('disconnect', () => {
    it('resets to disconnected on success', async () => {
      useMalAuthStore.setState({ status: CONNECTED });
      const disconnect = vi.fn().mockResolvedValue(undefined);
      setBridge({ disconnect });
      await useMalAuthStore.getState().disconnect();
      const s = useMalAuthStore.getState();
      expect(disconnect).toHaveBeenCalledOnce();
      expect(s.status).toEqual(DISCONNECTED);
      expect(s.loading).toBe(false);
    });

    it('sets disconnectError on failure (status preserved)', async () => {
      useMalAuthStore.setState({ status: CONNECTED });
      setBridge({ disconnect: vi.fn().mockRejectedValue(new Error('fail')) });
      await useMalAuthStore.getState().disconnect();
      const s = useMalAuthStore.getState();
      expect(s.error).toBe('accounts:mal.disconnectError');
      expect(s.status).toEqual(CONNECTED);
    });

    it('sets desktopOnly error with no bridge', async () => {
      setBridge(undefined);
      await useMalAuthStore.getState().disconnect();
      expect(useMalAuthStore.getState().error).toBe('accounts:mal.desktopOnly');
    });
  });
});
