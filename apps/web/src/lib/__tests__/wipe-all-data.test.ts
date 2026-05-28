import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ImportExportEvents } from '@shiroani/shared';

const mocks = vi.hoisted(() => ({
  isElectron: true,
  emitWithErrorHandling: vi.fn(),
}));

vi.mock('@/lib/platform', () => ({
  get IS_ELECTRON() {
    return mocks.isElectron;
  },
}));

vi.mock('@/lib/socket', () => ({
  emitWithErrorHandling: mocks.emitWithErrorHandling,
}));

import { wipeAllData } from '@/lib/wipe-all-data';

interface ElectronApiMock {
  store: { clear: ReturnType<typeof vi.fn> };
  browser: { clearSession: ReturnType<typeof vi.fn> };
  app: { clearUserFiles: ReturnType<typeof vi.fn>; relaunch: ReturnType<typeof vi.fn> };
}

function makeElectronApi(): ElectronApiMock {
  return {
    store: { clear: vi.fn().mockResolvedValue(undefined) },
    browser: { clearSession: vi.fn().mockResolvedValue(undefined) },
    app: {
      clearUserFiles: vi.fn().mockResolvedValue(undefined),
      relaunch: vi.fn().mockResolvedValue(undefined),
    },
  };
}

describe('wipeAllData', () => {
  let reload: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mocks.isElectron = true;
    mocks.emitWithErrorHandling.mockReset().mockResolvedValue({ success: true });
    reload = vi.fn();
    vi.stubGlobal('location', { reload });
    vi.spyOn(Storage.prototype, 'clear');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    delete (window as { electronAPI?: unknown }).electronAPI;
  });

  describe('desktop (Electron)', () => {
    it('clears every layer in order, then relaunches', async () => {
      const api = makeElectronApi();
      (window as unknown as { electronAPI: ElectronApiMock }).electronAPI = api;

      await wipeAllData();

      // 1. DB wipe with a generous (non-default) timeout
      expect(mocks.emitWithErrorHandling).toHaveBeenCalledWith(
        ImportExportEvents.CLEAR_ALL,
        {},
        { timeout: 120_000 }
      );
      // 2–5. local stores + assets + web storage
      expect(api.store.clear).toHaveBeenCalledOnce();
      expect(api.browser.clearSession).toHaveBeenCalledOnce();
      expect(api.app.clearUserFiles).toHaveBeenCalledOnce();
      expect(Storage.prototype.clear).toHaveBeenCalled();
      // 6. relaunch (not a web reload)
      expect(api.app.relaunch).toHaveBeenCalledOnce();
      expect(reload).not.toHaveBeenCalled();
    });

    it('aborts before touching local state if the DB wipe fails', async () => {
      const api = makeElectronApi();
      (window as unknown as { electronAPI: ElectronApiMock }).electronAPI = api;
      mocks.emitWithErrorHandling.mockRejectedValue(new Error('db boom'));

      await expect(wipeAllData()).rejects.toThrow('db boom');

      expect(api.store.clear).not.toHaveBeenCalled();
      expect(api.browser.clearSession).not.toHaveBeenCalled();
      expect(api.app.relaunch).not.toHaveBeenCalled();
    });

    it('aborts before touching local state if the DB wipe resolves unsuccessfully', async () => {
      // Distinct from the reject path above: the gateway can *resolve* with
      // { success: false } (handleGatewayRequest catches handler errors and
      // returns the default result rather than throwing).
      const api = makeElectronApi();
      (window as unknown as { electronAPI: ElectronApiMock }).electronAPI = api;
      mocks.emitWithErrorHandling.mockResolvedValue({ success: false });

      await expect(wipeAllData()).rejects.toThrow(/did not complete successfully/);

      expect(api.store.clear).not.toHaveBeenCalled();
      expect(api.browser.clearSession).not.toHaveBeenCalled();
      expect(api.app.clearUserFiles).not.toHaveBeenCalled();
      expect(api.app.relaunch).not.toHaveBeenCalled();
    });

    it('falls back to window.location.reload() when the relaunch bridge is missing', async () => {
      const api = makeElectronApi();
      (api.app as { relaunch?: unknown }).relaunch = undefined;
      (window as unknown as { electronAPI: ElectronApiMock }).electronAPI = api;

      await wipeAllData();

      // local clears still ran; the missing relaunch must not strand the user
      expect(api.store.clear).toHaveBeenCalledOnce();
      expect(reload).toHaveBeenCalledOnce();
    });

    it('still relaunches when a best-effort local clear fails', async () => {
      const api = makeElectronApi();
      api.store.clear.mockRejectedValue(new Error('store boom'));
      (window as unknown as { electronAPI: ElectronApiMock }).electronAPI = api;

      await expect(wipeAllData()).resolves.toBeUndefined();

      // failure of step 2 must not block steps 3–6
      expect(api.browser.clearSession).toHaveBeenCalledOnce();
      expect(api.app.clearUserFiles).toHaveBeenCalledOnce();
      expect(api.app.relaunch).toHaveBeenCalledOnce();
    });
  });

  describe('web (non-Electron)', () => {
    beforeEach(() => {
      mocks.isElectron = false;
    });

    it('clears web storage and reloads without touching the backend', async () => {
      await wipeAllData();

      expect(mocks.emitWithErrorHandling).not.toHaveBeenCalled();
      expect(Storage.prototype.clear).toHaveBeenCalled();
      expect(reload).toHaveBeenCalledOnce();
    });

    it('does not reload if clearing web storage throws (abort-critical on web)', async () => {
      vi.spyOn(Storage.prototype, 'clear').mockImplementation(() => {
        throw new Error('quota boom');
      });

      await expect(wipeAllData()).rejects.toThrow('quota boom');
      expect(reload).not.toHaveBeenCalled();
    });
  });
});
