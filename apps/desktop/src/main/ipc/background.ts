import { ipcMain, dialog, app, protocol, net } from 'electron';
import type { BrowserWindow } from 'electron';
import { existsSync, mkdirSync } from 'fs';
import { copyFile, unlink, stat } from 'fs/promises';
import { join, extname, resolve, sep } from 'path';
import { pathToFileURL } from 'url';
import { randomUUID } from 'crypto';
import { createMainLogger } from '../logging/logger';
import { t } from '../i18n-strings';
import { handle, handleWithFallback } from './with-ipc-handler';
import { backgroundPickSchema, backgroundRemoveSchema, backgroundGetUrlSchema } from './schemas';

const logger = createMainLogger('IPC:Background');

/** Directory inside userData where background images are stored */
export const BACKGROUNDS_DIR_NAME = 'backgrounds';

/** Allowed image extensions (lowercase, without dot) */
const ALLOWED_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp']);

/** Maximum file size: 20 MB */
const MAX_FILE_SIZE = 20 * 1024 * 1024;

/**
 * Check if a filename contains path-traversal or otherwise unsafe characters.
 */
function isUnsafeFileName(name: string): boolean {
  return name.includes('..') || name.includes('/') || name.includes('\\') || name.includes('\0');
}

/**
 * Get (and ensure existence of) the backgrounds directory
 */
function getBackgroundsDir(): string {
  const dir = join(app.getPath('userData'), BACKGROUNDS_DIR_NAME);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Validate that a file extension is an allowed image type
 */
function isAllowedExtension(filePath: string): boolean {
  const ext = extname(filePath).toLowerCase().replace('.', '');
  return ALLOWED_EXTENSIONS.has(ext);
}

/**
 * Register the shiroani-bg:// custom protocol for serving background images.
 * Must be called before app.ready (protocol.registerSchemesAsPrivileged)
 * or after app.ready (protocol.handle).
 *
 * Usage: shiroani-bg://backgrounds/<filename>
 */
export function registerBackgroundProtocol(): void {
  protocol.handle('shiroani-bg', request => {
    const url = new URL(request.url);
    // URL looks like shiroani-bg://backgrounds/filename.png
    // Decode so encoded separators don't bypass the shape check below.
    let fileName: string;
    try {
      fileName = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
    } catch {
      return new Response('Forbidden', { status: 403 });
    }

    // Security: reject path traversal
    if (!fileName || isUnsafeFileName(fileName)) {
      logger.warn(`Blocked background request with suspicious path: ${fileName}`);
      return new Response('Forbidden', { status: 403 });
    }

    // Validate extension
    if (!isAllowedExtension(fileName)) {
      logger.warn(`Blocked background request for non-image file: ${fileName}`);
      return new Response('Forbidden', { status: 403 });
    }

    const backgroundsDir = getBackgroundsDir();
    const filePath = resolve(join(backgroundsDir, fileName));

    // Containment check: even after the shape/extension guards, refuse to
    // serve any path that doesn't resolve inside the backgrounds directory.
    // Appending `sep` to the base prevents `backgroundsdir-evil/` from slipping
    // past a plain `startsWith` check when the dir has a sibling with a
    // similar prefix.
    const baseDir = resolve(backgroundsDir) + sep;
    if (!filePath.startsWith(baseDir)) {
      logger.warn(`Blocked background request outside base dir: ${filePath}`);
      return new Response('Forbidden', { status: 403 });
    }

    if (!existsSync(filePath)) {
      return new Response('Not Found', { status: 404 });
    }

    // Use `pathToFileURL` so Windows drive letters, spaces, and non-ASCII
    // characters are encoded correctly. The previous `file://${filePath}`
    // template relied on callers never using anything that needed escaping —
    // fine in practice today but brittle to future refactors.
    return net.fetch(pathToFileURL(filePath).href);
  });

  logger.info('Background protocol (shiroani-bg://) registered');
}

/**
 * Register IPC handlers for background image management
 */
export function registerBackgroundHandlers(mainWindow: BrowserWindow): void {
  handle(
    'background:pick',
    async (): Promise<{ fileName: string; url: string } | null> => {
      logger.debug('background:pick invoked');

      const result = await dialog.showOpenDialog(mainWindow, {
        title: t('dialog.selectBackground'),
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

      // Validate extension
      if (!isAllowedExtension(sourcePath)) {
        logger.warn(`Rejected file with invalid extension: ${sourcePath}`);
        throw new Error(t('background.unsupportedFormat'));
      }

      // Check file size
      const fileStats = await stat(sourcePath);
      if (fileStats.size > MAX_FILE_SIZE) {
        throw new Error(t('background.tooLarge'));
      }

      // Generate unique filename to avoid collisions
      const ext = extname(sourcePath).toLowerCase();
      const uniqueName = `bg-${randomUUID()}${ext}`;
      const destPath = join(getBackgroundsDir(), uniqueName);

      // Copy file to backgrounds directory
      await copyFile(sourcePath, destPath);
      logger.info(`Background image copied: ${uniqueName}`);

      const url = `shiroani-bg://backgrounds/${uniqueName}`;
      return { fileName: uniqueName, url };
    },
    { schema: backgroundPickSchema }
  );

  handle(
    'background:remove',
    async (_event, fileName): Promise<void> => {
      logger.debug(`background:remove invoked for: ${fileName}`);

      // Security: validate filename shape (Zod guarantees non-empty string)
      if (isUnsafeFileName(fileName)) {
        throw new Error('Invalid filename');
      }

      if (!isAllowedExtension(fileName)) {
        throw new Error('Invalid file type');
      }

      const filePath = join(getBackgroundsDir(), fileName);

      if (existsSync(filePath)) {
        await unlink(filePath);
        logger.info(`Background image removed: ${fileName}`);
      }
    },
    { schema: backgroundRemoveSchema }
  );

  handleWithFallback(
    'background:get-url',
    (_event, fileName): string | null => {
      if (isUnsafeFileName(fileName)) {
        return null;
      }

      const filePath = join(getBackgroundsDir(), fileName);
      if (!existsSync(filePath)) {
        return null;
      }

      return `shiroani-bg://backgrounds/${fileName}`;
    },
    () => null,
    { schema: backgroundGetUrlSchema }
  );
}

/**
 * Clean up background IPC handlers
 */
export function cleanupBackgroundHandlers(): void {
  ipcMain.removeHandler('background:pick');
  ipcMain.removeHandler('background:remove');
  ipcMain.removeHandler('background:get-url');
}
