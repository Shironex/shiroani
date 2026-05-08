import { ipcMain, dialog, protocol, net } from 'electron';
import type { BrowserWindow } from 'electron';
import { existsSync, mkdirSync } from 'fs';
import { copyFile, unlink, stat, readFile } from 'fs/promises';
import { join, extname, resolve, sep } from 'path';
import { pathToFileURL } from 'url';
import { randomUUID } from 'crypto';
import { createMainLogger } from '../logging/logger';
import { t } from '../i18n-strings';
import { handle, handleWithFallback } from './with-ipc-handler';
import {
  spritePickSchema,
  spriteRemoveSchema,
  spriteGetUrlSchema,
  spriteSetScaleModeSchema,
} from './schemas';
import {
  getMascotSpritesDir,
  getCustomSpriteFileName,
  setCustomSpriteFileName,
  setActiveSpriteScaleMode,
  getActiveSpriteScaleMode,
  type MascotSpriteScaleMode,
} from '../mascot/overlay-state';
import { applyActiveSprite } from '../mascot/overlay';

const logger = createMainLogger('IPC:Sprite');

/** Allowed image extensions (lowercase, without dot). Mirrors the picker file dialog. */
const ALLOWED_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp']);

/** Maximum file size: 10 MB — bumped from the background-image cap to accommodate animated GIFs. */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/** Maximum supported pixel dimension on either axis. */
const MAX_DIMENSION = 2048;

/** Minimum bytes we need to read to identify every supported magic-byte family. */
const MAGIC_PROBE_BYTES = 32;

/**
 * Magic-byte signatures by canonical extension. JPEG matches FFD8FF — the
 * fourth byte (E0/E1/DB/EE/etc.) is variant-specific and intentionally not
 * checked. The WEBP probe matches `RIFF????WEBP` against bytes 0-3 + 8-11.
 */
function detectImageFormat(bytes: Buffer): 'png' | 'jpeg' | 'gif' | 'webp' | null {
  if (bytes.length < 4) return null;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return 'png';
  }

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'jpeg';
  }

  // GIF87a / GIF89a
  if (
    bytes.length >= 6 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38 &&
    (bytes[4] === 0x37 || bytes[4] === 0x39) &&
    bytes[5] === 0x61
  ) {
    return 'gif';
  }

  // WEBP: 'RIFF' .... 'WEBP'
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'webp';
  }

  return null;
}

/**
 * Map a normalized extension (no dot) to the format token returned by
 * {@link detectImageFormat}. JPG is folded into JPEG.
 */
function extensionToFormat(ext: string): 'png' | 'jpeg' | 'gif' | 'webp' | null {
  if (ext === 'png') return 'png';
  if (ext === 'jpg' || ext === 'jpeg') return 'jpeg';
  if (ext === 'gif') return 'gif';
  if (ext === 'webp') return 'webp';
  return null;
}

/**
 * Check if a filename contains path-traversal or otherwise unsafe characters.
 */
function isUnsafeFileName(name: string): boolean {
  return name.includes('..') || name.includes('/') || name.includes('\\') || name.includes('\0');
}

/**
 * Delete a sprite file with EBUSY-aware retry. The native Win32 overlay
 * holds a GDI+ file mapping on the active sprite; swapping it to a new image
 * is processed asynchronously on the GUI thread (WM_CHANGE_ANIM), so even
 * after we point the overlay at the default sprite the previous file can
 * still be locked for a few frames. Five attempts × 60 ms ≈ 300 ms total —
 * comfortably within one frame budget at 60 fps × ~18 frames.
 *
 * Returns true on success or when the file was already gone, false when we
 * gave up. ENOENT counts as success because "delete a file that doesn't
 * exist" is the desired post-condition.
 */
async function unlinkWithRetry(filePath: string, label: string): Promise<boolean> {
  const MAX_ATTEMPTS = 5;
  const RETRY_DELAY_MS = 60;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await unlink(filePath);
      return true;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException | undefined)?.code;
      if (code === 'ENOENT') return true;
      if (code !== 'EBUSY' && code !== 'EPERM') {
        logger.warn(`Failed to remove ${label} (${code ?? 'unknown'}):`, err);
        return false;
      }
      if (attempt === MAX_ATTEMPTS) {
        logger.warn(
          `Failed to remove ${label} after ${MAX_ATTEMPTS} attempts (file still locked):`,
          err
        );
        return false;
      }
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
  return false;
}

/**
 * Get (and ensure existence of) the sprites directory.
 */
function ensureSpritesDir(): string {
  const dir = getMascotSpritesDir();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Validate that a file extension is an allowed image type.
 */
function isAllowedExtension(filePath: string): boolean {
  const ext = extname(filePath).toLowerCase().replace('.', '');
  return ALLOWED_EXTENSIONS.has(ext);
}

/**
 * Verify that the buffer's magic bytes match the expected format derived
 * from the file extension. Defence-in-depth on top of the extension
 * whitelist — a renamed `.exe` with a `.png` extension is rejected here.
 */
function assertContentMatchesExtension(
  buffer: Buffer,
  expected: 'png' | 'jpeg' | 'gif' | 'webp'
): void {
  const probe = buffer.subarray(0, MAGIC_PROBE_BYTES);
  const detected = detectImageFormat(probe);
  if (!detected) {
    throw new Error('Plik nie jest prawidłowym obrazem');
  }
  if (detected !== expected) {
    throw new Error('Zawartość pliku nie pasuje do rozszerzenia');
  }
}

/**
 * Best-effort dimension check for raw image bytes. Reads PNG IHDR, JPEG SOFn,
 * GIF logical screen descriptor, and WEBP VP8/VP8L/VP8X chunks. Returns null
 * when dimensions can't be parsed (e.g. truncated file) so the caller can
 * decide whether to reject. We err on the side of accepting unparseable
 * inputs because the GDI+ loader will surface a clearer error downstream.
 */
function readImageDimensions(
  buffer: Buffer,
  format: 'png' | 'jpeg' | 'gif' | 'webp'
): { width: number; height: number } | null {
  try {
    if (format === 'png') {
      // IHDR is the first chunk after the 8-byte signature; width and height
      // are big-endian uint32 at offsets 16 and 20.
      if (buffer.length < 24) return null;
      const width = buffer.readUInt32BE(16);
      const height = buffer.readUInt32BE(20);
      return { width, height };
    }
    if (format === 'gif') {
      // Logical screen descriptor at byte 6 (little-endian uint16 width/height).
      if (buffer.length < 10) return null;
      const width = buffer.readUInt16LE(6);
      const height = buffer.readUInt16LE(8);
      return { width, height };
    }
    if (format === 'webp') {
      // RIFF/WEBP container. 4-byte chunk header at offset 12 (e.g. 'VP8 ',
      // 'VP8L', 'VP8X'). We handle each since fixtures in the wild vary.
      if (buffer.length < 30) return null;
      const chunkType = buffer.toString('ascii', 12, 16);
      if (chunkType === 'VP8 ') {
        // Bitstream starts at offset 20 (after chunk header + 6-byte frame tag start);
        // dimensions live at offsets 26-29 as 14-bit little-endian halves.
        const w = buffer.readUInt16LE(26) & 0x3fff;
        const h = buffer.readUInt16LE(28) & 0x3fff;
        return { width: w, height: h };
      }
      if (chunkType === 'VP8L') {
        // Bytes 21-24 carry packed width-1 / height-1 in 14-bit fields.
        const b0 = buffer[21];
        const b1 = buffer[22];
        const b2 = buffer[23];
        const b3 = buffer[24];
        const width = 1 + (((b1 & 0x3f) << 8) | b0);
        const height = 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6));
        return { width, height };
      }
      if (chunkType === 'VP8X') {
        // 24-bit canvas width/height-1 at offsets 24/27.
        const width = 1 + (buffer.readUIntLE(24, 3) & 0xffffff);
        const height = 1 + (buffer.readUIntLE(27, 3) & 0xffffff);
        return { width, height };
      }
      return null;
    }
    if (format === 'jpeg') {
      // Walk markers until we hit a Start-Of-Frame (SOF0/SOF2 etc.). Skip
      // RST + SOI + EOI markers and standalone APP segments.
      let offset = 2;
      while (offset + 8 < buffer.length) {
        // Each marker is 0xFF then a non-zero, non-0xFF byte.
        if (buffer[offset] !== 0xff) return null;
        let marker = buffer[offset + 1];
        // Skip fill bytes
        while (marker === 0xff && offset + 1 < buffer.length) {
          offset += 1;
          marker = buffer[offset + 1];
        }
        offset += 2;
        // SOF markers we accept: 0xC0–0xCF except 0xC4 (DHT), 0xC8 (reserved), 0xCC (DAC).
        const isSOF =
          marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
        if (offset + 7 > buffer.length) return null;
        if (isSOF) {
          const height = buffer.readUInt16BE(offset + 3);
          const width = buffer.readUInt16BE(offset + 5);
          return { width, height };
        }
        // Otherwise skip this segment by its declared length
        const segLen = buffer.readUInt16BE(offset);
        offset += segLen;
      }
      return null;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Register the `shiroani-mascot://` custom protocol for serving sprite assets.
 *
 * URL form: `shiroani-mascot://sprites/<filename>`. Containment, traversal
 * and extension guards mirror the background protocol so the security envelope
 * is identical.
 */
export function registerMascotSpriteProtocol(): void {
  protocol.handle('shiroani-mascot', request => {
    const url = new URL(request.url);
    let fileName: string;
    try {
      fileName = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
    } catch {
      return new Response('Forbidden', { status: 403 });
    }

    if (!fileName || isUnsafeFileName(fileName)) {
      logger.warn(`Blocked sprite request with suspicious path: ${fileName}`);
      return new Response('Forbidden', { status: 403 });
    }

    if (!isAllowedExtension(fileName)) {
      logger.warn(`Blocked sprite request for non-image file: ${fileName}`);
      return new Response('Forbidden', { status: 403 });
    }

    const spritesDir = ensureSpritesDir();
    const filePath = resolve(join(spritesDir, fileName));

    const baseDir = resolve(spritesDir) + sep;
    if (!filePath.startsWith(baseDir)) {
      logger.warn(`Blocked sprite request outside base dir: ${filePath}`);
      return new Response('Forbidden', { status: 403 });
    }

    if (!existsSync(filePath)) {
      return new Response('Not Found', { status: 404 });
    }

    return net.fetch(pathToFileURL(filePath).href);
  });

  logger.info('Mascot sprite protocol (shiroani-mascot://) registered');
}

/**
 * Register IPC handlers for custom mascot sprite management.
 *
 * Channels:
 *   overlay:pick-sprite      — open dialog, validate, copy to userData/mascot-sprites/
 *   overlay:remove-sprite    — delete custom sprite + reset to bundled default
 *   overlay:get-sprite-url   — resolve a fileName to a `shiroani-mascot://` URL
 *   overlay:set-sprite-scale — persist + apply a new scale mode for the live sprite
 *   overlay:get-sprite-scale — read the persisted scale mode
 */
export function registerSpriteHandlers(mainWindow: BrowserWindow): void {
  handle(
    'overlay:pick-sprite',
    async (): Promise<{ fileName: string; url: string } | null> => {
      logger.debug('overlay:pick-sprite invoked');

      const result = await dialog.showOpenDialog(mainWindow, {
        title: t('dialog.selectSprite'),
        filters: [
          {
            name: t('dialog.imagesFilter'),
            extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'],
          },
        ],
        properties: ['openFile'],
      });

      if (result.canceled || result.filePaths.length === 0) {
        return null;
      }

      const sourcePath = result.filePaths[0];

      if (!isAllowedExtension(sourcePath)) {
        logger.warn(`Rejected sprite with invalid extension: ${sourcePath}`);
        throw new Error('Nieobsługiwany format pliku');
      }

      const fileStats = await stat(sourcePath);
      if (fileStats.size > MAX_FILE_SIZE) {
        throw new Error('Plik jest za duży (maksymalnie 10 MB)');
      }

      const ext = extname(sourcePath).toLowerCase().replace('.', '');
      const format = extensionToFormat(ext);
      if (!format) {
        throw new Error('Nieobsługiwany format pliku');
      }

      // Read the full file once for magic-byte + dimension probing.
      const buffer = await readFile(sourcePath);
      assertContentMatchesExtension(buffer, format);

      const dims = readImageDimensions(buffer, format);
      if (dims) {
        if (dims.width > MAX_DIMENSION || dims.height > MAX_DIMENSION) {
          throw new Error(`Obraz jest za duży (maks. ${MAX_DIMENSION}×${MAX_DIMENSION} px)`);
        }
        if (dims.width <= 0 || dims.height <= 0) {
          throw new Error('Obraz ma niepoprawne wymiary');
        }
      }

      // Generate unique filename to avoid collisions
      const uniqueName = `sprite-${randomUUID()}.${ext}`;
      const destPath = join(ensureSpritesDir(), uniqueName);

      await copyFile(sourcePath, destPath);
      logger.info(`Custom mascot sprite copied: ${uniqueName}`);

      // Order matters: update the active filename + push to the overlay FIRST
      // so GDI+ swaps to the new image and releases its handle on the previous
      // file. Only then can we unlink the previous file without EBUSY.
      const previous = getCustomSpriteFileName();
      setCustomSpriteFileName(uniqueName);

      try {
        applyActiveSprite();
      } catch (err) {
        logger.warn('Failed to apply new sprite to live overlay:', err);
      }

      if (previous && previous !== uniqueName) {
        const previousPath = join(ensureSpritesDir(), previous);
        if (existsSync(previousPath)) {
          await unlinkWithRetry(previousPath, `previous sprite ${previous}`);
        }
      }

      const url = `shiroani-mascot://sprites/${uniqueName}`;
      return { fileName: uniqueName, url };
    },
    { schema: spritePickSchema }
  );

  handle(
    'overlay:remove-sprite',
    async (_event, fileName): Promise<void> => {
      logger.debug(`overlay:remove-sprite invoked for: ${fileName}`);

      if (isUnsafeFileName(fileName)) {
        throw new Error('Invalid filename');
      }

      if (!isAllowedExtension(fileName)) {
        throw new Error('Invalid file type');
      }

      // Order matters: release the GDI+ handle on the active file BEFORE
      // attempting to unlink it. Pointing the overlay at the default sprite
      // first triggers WM_CHANGE_ANIM on the GUI thread, which loads a new
      // Image and releases the previous one. unlinkWithRetry then absorbs
      // any remaining lag while the async swap completes.
      const wasActive = getCustomSpriteFileName() === fileName;
      if (wasActive) {
        setCustomSpriteFileName(null);
        try {
          applyActiveSprite();
        } catch (err) {
          logger.warn('Failed to revert overlay to default sprite:', err);
        }
      }

      const filePath = join(ensureSpritesDir(), fileName);
      if (existsSync(filePath)) {
        const removed = await unlinkWithRetry(filePath, `sprite ${fileName}`);
        if (removed) {
          logger.info(`Custom mascot sprite removed: ${fileName}`);
        }
      }
    },
    { schema: spriteRemoveSchema }
  );

  handleWithFallback(
    'overlay:get-sprite-url',
    (_event, fileName): string | null => {
      if (isUnsafeFileName(fileName)) {
        return null;
      }

      const filePath = join(ensureSpritesDir(), fileName);
      if (!existsSync(filePath)) {
        return null;
      }

      return `shiroani-mascot://sprites/${fileName}`;
    },
    () => null,
    { schema: spriteGetUrlSchema }
  );

  handleWithFallback(
    'overlay:set-sprite-scale',
    (_event, mode: unknown): { success: boolean; mode: MascotSpriteScaleMode } => {
      if (mode !== 'contain' && mode !== 'cover' && mode !== 'stretch') {
        throw new Error('Invalid scale mode');
      }
      setActiveSpriteScaleMode(mode);
      try {
        applyActiveSprite();
      } catch (err) {
        logger.warn('Failed to apply new scale mode to live overlay:', err);
      }
      return { success: true, mode };
    },
    () => ({ success: false, mode: getActiveSpriteScaleMode() }),
    { schema: spriteSetScaleModeSchema }
  );

  handleWithFallback(
    'overlay:get-sprite-scale',
    () => getActiveSpriteScaleMode(),
    () => 'contain' as const
  );
}

/**
 * Clean up sprite IPC handlers.
 */
export function cleanupSpriteHandlers(): void {
  ipcMain.removeHandler('overlay:pick-sprite');
  ipcMain.removeHandler('overlay:remove-sprite');
  ipcMain.removeHandler('overlay:get-sprite-url');
  ipcMain.removeHandler('overlay:set-sprite-scale');
  ipcMain.removeHandler('overlay:get-sprite-scale');
}
