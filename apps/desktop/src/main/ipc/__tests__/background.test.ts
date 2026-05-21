jest.mock('electron');
jest.mock('../../logging/logger', () => ({
  createMainLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

import { tmpdir } from 'os';
import { join } from 'path';
import { mkdtempSync, rmSync, writeFileSync, existsSync } from 'fs';
import { ipcMain, app, dialog, BrowserWindow } from 'electron';
import { registerBackgroundHandlers, cleanupBackgroundHandlers } from '../background';

describe('registerBackgroundHandlers', () => {
  let tmpDir: string;
  let win: InstanceType<typeof BrowserWindow>;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'shiroani-bg-test-'));
    (app.getPath as jest.Mock).mockImplementation((name: string) => {
      if (name === 'userData') return tmpDir;
      return tmpDir;
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ipcMain as any).__reset();
    win = new BrowserWindow();
  });

  afterEach(() => {
    if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('background:get-url', () => {
    it('returns null when file does not exist', async () => {
      registerBackgroundHandlers(win);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (ipcMain as any).__invoke('background:get-url', 'nonexistent.png');
      expect(result).toBeNull();
    });

    it('returns shiroani-bg:// URL when file exists', async () => {
      // Pre-create backgrounds dir and file
      const bgDir = join(tmpDir, 'backgrounds');
      require('fs').mkdirSync(bgDir, { recursive: true });
      writeFileSync(join(bgDir, 'sample.png'), 'x');

      registerBackgroundHandlers(win);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (ipcMain as any).__invoke('background:get-url', 'sample.png');
      expect(result).toBe('shiroani-bg://backgrounds/sample.png');
    });

    it('returns null for unsafe filenames (path traversal)', async () => {
      registerBackgroundHandlers(win);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (ipcMain as any).__invoke('background:get-url', '../../etc/passwd');
      expect(result).toBeNull();
    });
  });

  describe('background:remove', () => {
    it('removes an existing file', async () => {
      const bgDir = join(tmpDir, 'backgrounds');
      require('fs').mkdirSync(bgDir, { recursive: true });
      const target = join(bgDir, 'remove-me.png');
      writeFileSync(target, 'x');

      registerBackgroundHandlers(win);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (ipcMain as any).__invoke('background:remove', 'remove-me.png');
      expect(existsSync(target)).toBe(false);
    });

    it('rejects path traversal', async () => {
      registerBackgroundHandlers(win);
      await expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (ipcMain as any).__invoke('background:remove', '../etc/passwd')
      ).rejects.toThrow(/Invalid filename/i);
    });

    it('rejects non-image extension', async () => {
      registerBackgroundHandlers(win);
      await expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (ipcMain as any).__invoke('background:remove', 'file.txt')
      ).rejects.toThrow(/Invalid file type/i);
    });

    it('no-ops silently when file does not exist', async () => {
      registerBackgroundHandlers(win);
      await expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (ipcMain as any).__invoke('background:remove', 'ghost.png')
      ).resolves.toBeUndefined();
    });
  });

  describe('background:pick', () => {
    it('returns null when dialog is cancelled', async () => {
      (dialog.showOpenDialog as jest.Mock).mockResolvedValue({
        canceled: true,
        filePaths: [],
      });
      registerBackgroundHandlers(win);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (ipcMain as any).__invoke('background:pick');
      expect(result).toBeNull();
    });

    it('copies file and returns URL when picked', async () => {
      const sourcePath = join(tmpDir, 'source.png');
      writeFileSync(sourcePath, 'fake-image');
      (dialog.showOpenDialog as jest.Mock).mockResolvedValue({
        canceled: false,
        filePaths: [sourcePath],
      });

      registerBackgroundHandlers(win);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (ipcMain as any).__invoke('background:pick');
      expect(result).toMatchObject({
        fileName: expect.stringMatching(/^bg-.*\.png$/),
        url: expect.stringMatching(/^shiroani-bg:\/\/backgrounds\/bg-.*\.png$/),
      });
    });

    it('rejects unsupported extension from picker', async () => {
      const sourcePath = join(tmpDir, 'bad.txt');
      writeFileSync(sourcePath, 'not an image');
      (dialog.showOpenDialog as jest.Mock).mockResolvedValue({
        canceled: false,
        filePaths: [sourcePath],
      });

      registerBackgroundHandlers(win);
      await expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (ipcMain as any).__invoke('background:pick')
      ).rejects.toThrow(/unsupported file format|nieobsługiwany format/i);
    });
  });

  describe('cleanupBackgroundHandlers', () => {
    it('removes all background handlers', () => {
      registerBackgroundHandlers(win);
      cleanupBackgroundHandlers();
      ['background:pick', 'background:remove', 'background:get-url'].forEach(ch => {
        expect(ipcMain.removeHandler).toHaveBeenCalledWith(ch);
      });
    });
  });
});
