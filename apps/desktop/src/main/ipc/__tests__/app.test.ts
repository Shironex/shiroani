jest.mock('electron');
jest.mock('../../logging/logger', () => ({
  createMainLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
  getLogsDir: jest.fn(() => '/tmp/shiroani-test-logs'),
}));
jest.mock('../../backend-port', () => ({
  getBackendPort: jest.fn(() => 3000),
}));

import { ipcMain, app, clipboard, nativeImage } from 'electron';
import { registerAppHandlers, cleanupAppHandlers } from '../app';

describe('registerAppHandlers', () => {
  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ipcMain as any).__reset();
    (app.getPath as jest.Mock).mockReturnValue('/tmp/shiroani-test');
    (app.getVersion as jest.Mock).mockReturnValue('1.2.3');
    (app.getLoginItemSettings as jest.Mock).mockReturnValue({ openAtLogin: false });
  });

  describe('app:get-path', () => {
    it('returns path for whitelisted name', async () => {
      registerAppHandlers();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (ipcMain as any).__invoke('app:get-path', 'userData');
      expect(app.getPath).toHaveBeenCalledWith('userData');
      expect(result).toBe('/tmp/shiroani-test');
    });

    it('returns undefined for non-whitelisted path name', async () => {
      registerAppHandlers();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (ipcMain as any).__invoke('app:get-path', 'music');
      expect(result).toBeUndefined();
    });

    it('BAD_REQUEST on non-string name', async () => {
      registerAppHandlers();
      await expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (ipcMain as any).__invoke('app:get-path', 42)
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    });
  });

  describe('app:get-version', () => {
    it('returns the app version', async () => {
      registerAppHandlers();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (ipcMain as any).__invoke('app:get-version');
      expect(result).toBe('1.2.3');
    });
  });

  describe('app:clipboard-write', () => {
    it('calls clipboard.writeText', async () => {
      registerAppHandlers();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (ipcMain as any).__invoke('app:clipboard-write', 'hello');
      expect(clipboard.writeText).toHaveBeenCalledWith('hello');
    });

    it('BAD_REQUEST on non-string', async () => {
      registerAppHandlers();
      await expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (ipcMain as any).__invoke('app:clipboard-write', 123)
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    });
  });

  // Electron 44 removed clipboard.writeImage(); images now go through
  // clipboard.write([new ClipboardItem({ 'image/png': Blob })]).
  describe('app:clipboard-write-image', () => {
    const PNG_BASE64 = Buffer.from('fake-png-bytes').toString('base64');

    // jest is not configured with clearMocks, so call history would otherwise
    // leak between the cases below.
    beforeEach(() => {
      (clipboard.write as jest.Mock).mockClear();
      (nativeImage.createFromBuffer as jest.Mock).mockClear();
    });

    it('writes a ClipboardItem carrying the decoded png bytes', async () => {
      (nativeImage.createFromBuffer as jest.Mock).mockReturnValue({ isEmpty: () => false });
      registerAppHandlers();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (ipcMain as any).__invoke('app:clipboard-write-image', PNG_BASE64);

      expect(nativeImage.createFromBuffer).toHaveBeenCalledWith(Buffer.from(PNG_BASE64, 'base64'));
      expect(clipboard.write).toHaveBeenCalledTimes(1);

      const [items] = (clipboard.write as jest.Mock).mock.calls[0];
      expect(items).toHaveLength(1);
      expect(items[0].types).toEqual(['image/png']);

      const blob = await items[0].getType('image/png');
      expect(blob.type).toBe('image/png');
      await expect(blob.text()).resolves.toBe('fake-png-bytes');
    });

    it('throws when the payload does not decode to an image', async () => {
      (nativeImage.createFromBuffer as jest.Mock).mockReturnValue({ isEmpty: () => true });
      registerAppHandlers();
      await expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (ipcMain as any).__invoke('app:clipboard-write-image', PNG_BASE64)
      ).rejects.toThrow('Failed to create image from provided data');
      expect(clipboard.write).not.toHaveBeenCalled();
    });

    it('BAD_REQUEST on non-string', async () => {
      registerAppHandlers();
      await expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (ipcMain as any).__invoke('app:clipboard-write-image', 42)
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    });
  });

  describe('app:get-auto-launch', () => {
    it('returns openAtLogin flag', async () => {
      (app.getLoginItemSettings as jest.Mock).mockReturnValue({ openAtLogin: true });
      registerAppHandlers();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (ipcMain as any).__invoke('app:get-auto-launch');
      expect(result).toBe(true);
    });
  });

  describe('app:set-auto-launch', () => {
    it('calls setLoginItemSettings and returns new value', async () => {
      (app.getLoginItemSettings as jest.Mock).mockReturnValue({ openAtLogin: true });
      registerAppHandlers();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (ipcMain as any).__invoke('app:set-auto-launch', true);
      expect(app.setLoginItemSettings).toHaveBeenCalledWith({ openAtLogin: true });
      expect(result).toBe(true);
    });

    it('BAD_REQUEST on non-boolean', async () => {
      registerAppHandlers();
      await expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (ipcMain as any).__invoke('app:set-auto-launch', 'yes')
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    });
  });

  describe('app:get-backend-port', () => {
    it('returns the backend port', async () => {
      registerAppHandlers();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (ipcMain as any).__invoke('app:get-backend-port');
      expect(result).toBe(3000);
    });
  });

  describe('app:log-write', () => {
    it('never throws (handleWithFallback, no schema)', async () => {
      registerAppHandlers();
      await expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (ipcMain as any).__invoke('app:log-write', {
          level: 'info',
          context: 'Test',
          message: 'ok',
        })
      ).resolves.toBeUndefined();
    });

    it('silently ignores malformed payloads (no throw)', async () => {
      registerAppHandlers();
      await expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (ipcMain as any).__invoke('app:log-write', { level: 'not-a-level' })
      ).resolves.toBeUndefined();
    });

    it('silently ignores completely invalid payload shapes', async () => {
      registerAppHandlers();
      await expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (ipcMain as any).__invoke('app:log-write', 'not-an-object')
      ).resolves.toBeUndefined();
    });
  });

  describe('app:set-log-level', () => {
    it('returns envelope on unknown level', async () => {
      registerAppHandlers();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (ipcMain as any).__invoke('app:set-log-level', { level: 'nope' });
      expect(result).toMatchObject({ ok: false });
    });
  });

  describe('cleanupAppHandlers', () => {
    it('removes all app handlers', () => {
      registerAppHandlers();
      cleanupAppHandlers();
      expect(ipcMain.removeHandler).toHaveBeenCalledWith('app:get-path');
      expect(ipcMain.removeHandler).toHaveBeenCalledWith('app:get-version');
      expect(ipcMain.removeHandler).toHaveBeenCalledWith('app:clipboard-write');
      expect(ipcMain.removeHandler).toHaveBeenCalledWith('app:log-write');
      expect(ipcMain.removeHandler).toHaveBeenCalledWith('app:set-log-level');
    });
  });
});
