import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { AniListAuthStatus } from '@shiroani/shared';
import { useAniListAuthStore } from '../useAniListAuthStore';

const CONNECTED: AniListAuthStatus = {
  connected: true,
  viewer: { id: 7, name: 'Anya', avatar: 'https://example.com/a.png' },
  expiresAt: 1_900_000_000_000,
};
const DISCONNECTED: AniListAuthStatus = { connected: false };

function setBridge(bridge: unknown) {
  (window as unknown as { electronAPI?: unknown }).electronAPI = bridge
    ? { anilistAuth: bridge }
    : undefined;
}

function resetStore() {
  useAniListAuthStore.setState({ status: DISCONNECTED, loading: false, error: null });
}

describe('useAniListAuthStore', () => {
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
      await useAniListAuthStore.getState().fetchStatus();
      const s = useAniListAuthStore.getState();
      expect(s.status).toEqual(CONNECTED);
      expect(s.loading).toBe(false);
      expect(s.error).toBeNull();
    });

    it('clears loading on bridge failure', async () => {
      setBridge({ getStatus: vi.fn().mockRejectedValue(new Error('boom')) });
      await useAniListAuthStore.getState().fetchStatus();
      expect(useAniListAuthStore.getState().loading).toBe(false);
    });

    it('sets desktopOnly error when electronAPI is absent (web fallback)', async () => {
      setBridge(undefined);
      await useAniListAuthStore.getState().fetchStatus();
      const s = useAniListAuthStore.getState();
      expect(s.status).toEqual(DISCONNECTED);
      expect(s.error).toBe('accounts:anilist.desktopOnly');
    });
  });

  describe('connect', () => {
    it('stores the returned status on success', async () => {
      const connect = vi.fn().mockResolvedValue(CONNECTED);
      setBridge({ connect });
      await useAniListAuthStore.getState().connect();
      const s = useAniListAuthStore.getState();
      expect(connect).toHaveBeenCalledOnce();
      expect(s.status).toEqual(CONNECTED);
      expect(s.loading).toBe(false);
      expect(s.error).toBeNull();
    });

    it('sets connectError on failure', async () => {
      setBridge({ connect: vi.fn().mockRejectedValue(new Error('nope')) });
      await useAniListAuthStore.getState().connect();
      const s = useAniListAuthStore.getState();
      expect(s.loading).toBe(false);
      expect(s.error).toBe('accounts:anilist.connectError');
    });

    it('sets desktopOnly error with no bridge', async () => {
      setBridge(undefined);
      await useAniListAuthStore.getState().connect();
      expect(useAniListAuthStore.getState().error).toBe('accounts:anilist.desktopOnly');
    });
  });

  describe('disconnect', () => {
    it('resets to disconnected on success', async () => {
      useAniListAuthStore.setState({ status: CONNECTED });
      const disconnect = vi.fn().mockResolvedValue(undefined);
      setBridge({ disconnect });
      await useAniListAuthStore.getState().disconnect();
      const s = useAniListAuthStore.getState();
      expect(disconnect).toHaveBeenCalledOnce();
      expect(s.status).toEqual(DISCONNECTED);
      expect(s.loading).toBe(false);
    });

    it('sets disconnectError on failure (status preserved)', async () => {
      useAniListAuthStore.setState({ status: CONNECTED });
      setBridge({ disconnect: vi.fn().mockRejectedValue(new Error('fail')) });
      await useAniListAuthStore.getState().disconnect();
      const s = useAniListAuthStore.getState();
      expect(s.error).toBe('accounts:anilist.disconnectError');
      expect(s.status).toEqual(CONNECTED);
    });

    it('sets desktopOnly error with no bridge', async () => {
      setBridge(undefined);
      await useAniListAuthStore.getState().disconnect();
      expect(useAniListAuthStore.getState().error).toBe('accounts:anilist.desktopOnly');
    });
  });
});
