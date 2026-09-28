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
import { mkdtempSync, rmSync, writeFileSync, existsSync, readdirSync, readFileSync } from 'fs';
import { ipcMain, app, dialog, BrowserWindow } from 'electron';
import { registerBackgroundHandlers, cleanupBackgroundHandlers } from '../background';

/** Typed access to the electron mock's test-only invoke hook. */
const invoke = (channel: string, ...args: unknown[]): Promise<unknown> =>
  (ipcMain as unknown as { __invoke: (ch: string, ...a: unknown[]) => Promise<unknown> }).__invoke(
    channel,
    ...args
  );

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const UUID_PATTERN = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

/** Bytes that start with the given signature, padded to `size`. */
function bytesWithSignature(signature: number[], size = 64): Uint8Array {
  const bytes = new Uint8Array(size);
  bytes.set(signature);
  return bytes;
}

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

  describe('background:add-from-bytes', () => {
    const bgDir = () => join(tmpDir, 'backgrounds');
    const storedFiles = () => (existsSync(bgDir()) ? readdirSync(bgDir()) : []);

    it('writes valid PNG bytes under a name generated by main', async () => {
      const bytes = bytesWithSignature(PNG_SIGNATURE);
      registerBackgroundHandlers(win);

      const result = (await invoke('background:add-from-bytes', bytes)) as {
        ok: true;
        fileName: string;
        url: string;
      };

      expect(result.ok).toBe(true);
      expect(result.fileName).toMatch(new RegExp(`^bg-${UUID_PATTERN}\\.png$`));
      expect(result.url).toBe(`shiroani-bg://backgrounds/${result.fileName}`);
      expect(storedFiles()).toEqual([result.fileName]);
      expect(new Uint8Array(readFileSync(join(bgDir(), result.fileName)))).toEqual(bytes);
    });

    it('names the file after the detected signature (JPEG is stored as .jpg)', async () => {
      registerBackgroundHandlers(win);
      const result = (await invoke(
        'background:add-from-bytes',
        bytesWithSignature([0xff, 0xd8, 0xff, 0xe0])
      )) as { ok: true; fileName: string };
      expect(result.fileName).toMatch(/^bg-.*\.jpg$/);
    });

    it('rejects bytes over the 20 MB cap and writes nothing', async () => {
      registerBackgroundHandlers(win);
      const result = await invoke(
        'background:add-from-bytes',
        bytesWithSignature(PNG_SIGNATURE, 20 * 1024 * 1024 + 1)
      );
      expect(result).toEqual({ ok: false, reason: 'too-large' });
      expect(storedFiles()).toEqual([]);
    });

    it('accepts bytes exactly at the 20 MB cap', async () => {
      registerBackgroundHandlers(win);
      const result = (await invoke(
        'background:add-from-bytes',
        bytesWithSignature(PNG_SIGNATURE, 20 * 1024 * 1024)
      )) as { ok: boolean };
      expect(result.ok).toBe(true);
    });

    it('rejects bytes without an image signature and writes nothing', async () => {
      registerBackgroundHandlers(win);
      const result = await invoke(
        'background:add-from-bytes',
        new TextEncoder().encode('MZ definitely an executable, not a picture')
      );
      expect(result).toEqual({ ok: false, reason: 'not-an-image' });
      expect(storedFiles()).toEqual([]);
    });

    it('rejects empty bytes', async () => {
      registerBackgroundHandlers(win);
      const result = await invoke('background:add-from-bytes', new Uint8Array(0));
      expect(result).toEqual({ ok: false, reason: 'not-an-image' });
    });

    it('refuses a filesystem path instead of bytes (schema)', async () => {
      const sourcePath = join(tmpDir, 'source.png');
      writeFileSync(sourcePath, Buffer.from(PNG_SIGNATURE));
      registerBackgroundHandlers(win);
      await expect(invoke('background:add-from-bytes', sourcePath)).rejects.toThrow(
        /Invalid payload for background:add-from-bytes/
      );
      expect(storedFiles()).toEqual([]);
    });
  });

  describe('cleanupBackgroundHandlers', () => {
    it('removes all background handlers', () => {
      registerBackgroundHandlers(win);
      cleanupBackgroundHandlers();
      [
        'background:pick',
        'background:add-from-bytes',
        'background:remove',
        'background:get-url',
      ].forEach(ch => {
        expect(ipcMain.removeHandler).toHaveBeenCalledWith(ch);
      });
    });
  });
});
