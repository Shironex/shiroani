jest.mock('electron');
jest.mock('../../logging/logger', () => ({
  createMainLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

// Mascot overlay's `applyActiveSprite` needs the native addon — stub it so
// sprite IPC tests run without loading the real .node binary or the
// platform-gated overlay state.
jest.mock('../../mascot/overlay', () => ({
  applyActiveSprite: jest.fn(),
}));

// In-memory shim for the persisted sprite filename + scale mode. The real
// `store` module wraps electron-store and isn't safe to import in unit tests.
const storeState: Record<string, unknown> = {};
jest.mock('../../store', () => ({
  store: {
    get: jest.fn((key: string) => storeState[key]),
    set: jest.fn((key: string, value: unknown) => {
      storeState[key] = value;
    }),
    delete: jest.fn((key: string) => {
      delete storeState[key];
    }),
  },
}));

import { tmpdir } from 'os';
import { join } from 'path';
import { mkdtempSync, rmSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { ipcMain, app, dialog, BrowserWindow } from 'electron';
import { registerSpriteHandlers, cleanupSpriteHandlers } from '../sprite';

/**
 * Compose a minimal valid PNG buffer (1x1 transparent) for happy-path tests.
 * The exact pixel data doesn't matter — the IPC layer only checks magic bytes
 * and the IHDR width/height fields.
 */
function makePngBytes(width = 1, height = 1): Buffer {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdrType = Buffer.from('IHDR');
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type (RGBA)
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdrLen = Buffer.alloc(4);
  ihdrLen.writeUInt32BE(ihdrData.length, 0);
  // CRC is not validated by our parser — fill with zeros.
  const ihdrCrc = Buffer.alloc(4);
  // IEND
  const iendLen = Buffer.alloc(4);
  const iendType = Buffer.from('IEND');
  const iendCrc = Buffer.alloc(4);
  return Buffer.concat([
    signature,
    ihdrLen,
    ihdrType,
    ihdrData,
    ihdrCrc,
    iendLen,
    iendType,
    iendCrc,
  ]);
}

describe('registerSpriteHandlers', () => {
  let tmpDir: string;
  let win: InstanceType<typeof BrowserWindow>;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'shiroani-sprite-test-'));
    (app.getPath as jest.Mock).mockImplementation((name: string) => {
      if (name === 'userData') return tmpDir;
      return tmpDir;
    });
    Object.keys(storeState).forEach(k => delete storeState[k]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ipcMain as any).__reset();
    win = new BrowserWindow();
  });

  afterEach(() => {
    cleanupSpriteHandlers();
    if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('overlay:get-sprite-url', () => {
    it('returns null when file does not exist', async () => {
      registerSpriteHandlers(win);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (ipcMain as any).__invoke('overlay:get-sprite-url', 'nonexistent.png');
      expect(result).toBeNull();
    });

    it('returns shiroani-mascot:// URL when file exists', async () => {
      const spritesDir = join(tmpDir, 'mascot-sprites');
      mkdirSync(spritesDir, { recursive: true });
      writeFileSync(join(spritesDir, 'sample.png'), 'x');

      registerSpriteHandlers(win);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (ipcMain as any).__invoke('overlay:get-sprite-url', 'sample.png');
      expect(result).toBe('shiroani-mascot://sprites/sample.png');
    });

    it('returns null for unsafe filenames (path traversal)', async () => {
      registerSpriteHandlers(win);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (ipcMain as any).__invoke('overlay:get-sprite-url', '../../etc/passwd');
      expect(result).toBeNull();
    });
  });

  describe('overlay:remove-sprite', () => {
    it('removes an existing file', async () => {
      const spritesDir = join(tmpDir, 'mascot-sprites');
      mkdirSync(spritesDir, { recursive: true });
      const target = join(spritesDir, 'remove-me.png');
      writeFileSync(target, 'x');

      registerSpriteHandlers(win);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (ipcMain as any).__invoke('overlay:remove-sprite', 'remove-me.png');
      expect(existsSync(target)).toBe(false);
    });

    it('rejects path traversal', async () => {
      registerSpriteHandlers(win);
      await expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (ipcMain as any).__invoke('overlay:remove-sprite', '../etc/passwd')
      ).rejects.toThrow(/Invalid filename/i);
    });

    it('rejects non-image extension', async () => {
      registerSpriteHandlers(win);
      await expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (ipcMain as any).__invoke('overlay:remove-sprite', 'file.txt')
      ).rejects.toThrow(/Invalid file type/i);
    });

    it('clears the persisted active sprite when removing the active file', async () => {
      const spritesDir = join(tmpDir, 'mascot-sprites');
      mkdirSync(spritesDir, { recursive: true });
      writeFileSync(join(spritesDir, 'active.png'), 'x');
      storeState['settings.mascotCustomSprite'] = 'active.png';

      registerSpriteHandlers(win);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (ipcMain as any).__invoke('overlay:remove-sprite', 'active.png');
      expect(storeState['settings.mascotCustomSprite']).toBeUndefined();
    });

    it('no-ops silently when file does not exist', async () => {
      registerSpriteHandlers(win);
      await expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (ipcMain as any).__invoke('overlay:remove-sprite', 'ghost.png')
      ).resolves.toBeUndefined();
    });
  });

  describe('overlay:pick-sprite', () => {
    it('returns null when dialog is cancelled', async () => {
      (dialog.showOpenDialog as jest.Mock).mockResolvedValue({
        canceled: true,
        filePaths: [],
      });
      registerSpriteHandlers(win);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (ipcMain as any).__invoke('overlay:pick-sprite');
      expect(result).toBeNull();
    });

    it('copies a valid PNG and persists the active filename', async () => {
      const sourcePath = join(tmpDir, 'source.png');
      writeFileSync(sourcePath, makePngBytes(64, 64));
      (dialog.showOpenDialog as jest.Mock).mockResolvedValue({
        canceled: false,
        filePaths: [sourcePath],
      });

      registerSpriteHandlers(win);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (ipcMain as any).__invoke('overlay:pick-sprite');
      expect(result).toMatchObject({
        fileName: expect.stringMatching(/^sprite-.*\.png$/),
        url: expect.stringMatching(/^shiroani-mascot:\/\/sprites\/sprite-.*\.png$/),
      });
      expect(storeState['settings.mascotCustomSprite']).toBe(result.fileName);
    });

    it('rejects unsupported extension from picker', async () => {
      const sourcePath = join(tmpDir, 'bad.txt');
      writeFileSync(sourcePath, 'not an image');
      (dialog.showOpenDialog as jest.Mock).mockResolvedValue({
        canceled: false,
        filePaths: [sourcePath],
      });

      registerSpriteHandlers(win);
      await expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (ipcMain as any).__invoke('overlay:pick-sprite')
      ).rejects.toThrow(/unsupported file format|nieobsługiwany format/i);
    });

    it('rejects when magic bytes do not match the extension', async () => {
      // Pretend a plain text file is a PNG.
      const sourcePath = join(tmpDir, 'fake.png');
      writeFileSync(sourcePath, 'I am definitely not a PNG');
      (dialog.showOpenDialog as jest.Mock).mockResolvedValue({
        canceled: false,
        filePaths: [sourcePath],
      });

      registerSpriteHandlers(win);
      await expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (ipcMain as any).__invoke('overlay:pick-sprite')
      ).rejects.toThrow(/valid image|match its extension|prawidłowym obrazem|rozszerzenia/i);
    });

    it('rejects images larger than the dimension cap', async () => {
      const sourcePath = join(tmpDir, 'huge.png');
      writeFileSync(sourcePath, makePngBytes(4096, 4096));
      (dialog.showOpenDialog as jest.Mock).mockResolvedValue({
        canceled: false,
        filePaths: [sourcePath],
      });

      registerSpriteHandlers(win);
      await expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (ipcMain as any).__invoke('overlay:pick-sprite')
      ).rejects.toThrow(/2048×2048/);
    });
  });

  describe('overlay:set-sprite-scale', () => {
    it('persists a valid mode and returns success envelope', async () => {
      registerSpriteHandlers(win);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (ipcMain as any).__invoke('overlay:set-sprite-scale', 'cover');
      expect(result).toEqual({ success: true, mode: 'cover' });
      expect(storeState['settings.mascotSpriteScaleMode']).toBe('cover');
    });

    it('falls back instead of throwing on invalid mode', async () => {
      registerSpriteHandlers(win);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (ipcMain as any).__invoke('overlay:set-sprite-scale', 'wobble');
      // handleWithFallback collapses thrown errors to the fallback envelope.
      expect(result).toEqual({ success: false, mode: 'contain' });
    });
  });

  describe('overlay:get-sprite-scale', () => {
    it('returns the persisted scale mode', async () => {
      storeState['settings.mascotSpriteScaleMode'] = 'stretch';
      registerSpriteHandlers(win);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (ipcMain as any).__invoke('overlay:get-sprite-scale');
      expect(result).toBe('stretch');
    });

    it('defaults to contain when no value is persisted', async () => {
      registerSpriteHandlers(win);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (ipcMain as any).__invoke('overlay:get-sprite-scale');
      expect(result).toBe('contain');
    });
  });

  describe('cleanupSpriteHandlers', () => {
    it('removes all sprite handlers', () => {
      registerSpriteHandlers(win);
      cleanupSpriteHandlers();
      [
        'overlay:pick-sprite',
        'overlay:remove-sprite',
        'overlay:get-sprite-url',
        'overlay:set-sprite-scale',
        'overlay:get-sprite-scale',
      ].forEach(ch => {
        expect(ipcMain.removeHandler).toHaveBeenCalledWith(ch);
      });
    });
  });
});
