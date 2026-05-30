jest.mock('electron');
jest.mock('../../logging/logger', () => ({
  createMainLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

const mockStore = {
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
};
jest.mock('../../store', () => ({ store: mockStore }));

import { ipcMain } from 'electron';
import { registerStoreHandlers, cleanupStoreHandlers } from '../store';

describe('registerStoreHandlers', () => {
  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ipcMain as any).__reset();
    mockStore.get.mockReset();
    mockStore.set.mockReset();
    mockStore.delete.mockReset();
  });

  describe('store:get', () => {
    it('returns value for allowed key', async () => {
      mockStore.get.mockReturnValue({ theme: 'dark' });
      registerStoreHandlers();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (ipcMain as any).__invoke('store:get', 'preferences');
      expect(result).toEqual({ theme: 'dark' });
      expect(mockStore.get).toHaveBeenCalledWith('preferences');
    });

    it('returns undefined for disallowed key', async () => {
      registerStoreHandlers();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (ipcMain as any).__invoke('store:get', 'some.evil.key');
      expect(result).toBeUndefined();
      expect(mockStore.get).not.toHaveBeenCalled();
    });

    it('allows nested keys under an allowed prefix', async () => {
      mockStore.get.mockReturnValue('en');
      registerStoreHandlers();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (ipcMain as any).__invoke('store:get', 'preferences.theme');
      expect(result).toBe('en');
      expect(mockStore.get).toHaveBeenCalledWith('preferences.theme');
    });

    it('BAD_REQUEST on empty-string key (handleWithFallback rethrows validation)', async () => {
      registerStoreHandlers();
      await expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (ipcMain as any).__invoke('store:get', '')
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    });
  });

  describe('store:set', () => {
    it('sets value for allowed key', async () => {
      registerStoreHandlers();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (ipcMain as any).__invoke('store:set', 'settings.language', 'pl');
      expect(mockStore.set).toHaveBeenCalledWith('settings.language', 'pl');
    });

    it('does NOT set value for disallowed key', async () => {
      registerStoreHandlers();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (ipcMain as any).__invoke('store:set', 'malicious.key', 'x');
      expect(mockStore.set).not.toHaveBeenCalled();
    });

    it.each(['browser-history', 'settings.autoTrackProgress', 'settings.feedRefreshOnStartup'])(
      'sets value for explicitly-allowed key %s',
      async key => {
        registerStoreHandlers();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (ipcMain as any).__invoke('store:set', key, true);
        expect(mockStore.set).toHaveBeenCalledWith(key, true);
      }
    );

    it('BLOCKS writes to an un-enumerated settings.* key (writes are exact-match only)', async () => {
      registerStoreHandlers();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (ipcMain as any).__invoke('store:set', 'settings.somethingElse', 'x');
      expect(mockStore.set).not.toHaveBeenCalled();
    });

    it('throws when value is too large', async () => {
      registerStoreHandlers();
      const huge = 'x'.repeat(1_000_001);
      await expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (ipcMain as any).__invoke('store:set', 'settings', huge)
      ).rejects.toThrow(/too large/i);
    });

    it('BAD_REQUEST on empty key', async () => {
      registerStoreHandlers();
      await expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (ipcMain as any).__invoke('store:set', '', 'x')
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    });
  });

  describe('store:delete', () => {
    it('deletes allowed key', async () => {
      registerStoreHandlers();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (ipcMain as any).__invoke('store:delete', 'library-bookmarks');
      expect(mockStore.delete).toHaveBeenCalledWith('library-bookmarks');
    });

    it('deletes newly-allowed browser-history key', async () => {
      registerStoreHandlers();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (ipcMain as any).__invoke('store:delete', 'browser-history');
      expect(mockStore.delete).toHaveBeenCalledWith('browser-history');
    });

    it('does NOT delete disallowed key', async () => {
      registerStoreHandlers();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (ipcMain as any).__invoke('store:delete', 'evil');
      expect(mockStore.delete).not.toHaveBeenCalled();
    });
  });

  describe('cleanupStoreHandlers', () => {
    it('removes all store handlers', () => {
      registerStoreHandlers();
      cleanupStoreHandlers();
      expect(ipcMain.removeHandler).toHaveBeenCalledWith('store:get');
      expect(ipcMain.removeHandler).toHaveBeenCalledWith('store:set');
      expect(ipcMain.removeHandler).toHaveBeenCalledWith('store:delete');
    });
  });
});
