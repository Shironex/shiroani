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
import {
  extensionToFormat,
  assertContentMatchesExtension,
  readImageDimensions,
} from '../image/probe';

const logger = createMainLogger('IPC:Sprite');

/** Allowed image extensions (lowercase, without dot). Mirrors the picker file dialog. */
const ALLOWED_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp']);

/** Maximum file size: 10 MB — bumped from the background-image cap to accommodate animated GIFs. */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/** Maximum supported pixel dimension on either axis. */
const MAX_DIMENSION = 2048;

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
        throw new Error(t('sprite.unsupportedFormat'));
      }

      const fileStats = await stat(sourcePath);
      if (fileStats.size > MAX_FILE_SIZE) {
        throw new Error(t('sprite.tooLarge'));
      }

      const ext = extname(sourcePath).toLowerCase().replace('.', '');
      const format = extensionToFormat(ext);
      if (!format) {
        throw new Error(t('sprite.unsupportedFormat'));
      }

      // Read the full file once for magic-byte + dimension probing.
      const buffer = await readFile(sourcePath);
      assertContentMatchesExtension(buffer, format);

      const dims = readImageDimensions(buffer, format);
      if (dims) {
        if (dims.width > MAX_DIMENSION || dims.height > MAX_DIMENSION) {
          throw new Error(t('sprite.dimensionsTooLarge', { max: MAX_DIMENSION }));
        }
        if (dims.width <= 0 || dims.height <= 0) {
          throw new Error(t('sprite.invalidDimensions'));
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
