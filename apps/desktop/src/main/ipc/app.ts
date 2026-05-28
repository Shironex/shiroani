import { ipcMain, app, clipboard, nativeImage } from 'electron';
import { resolve, sep, join } from 'path';
import { writeFile, rm } from 'fs/promises';
import { release as osRelease } from 'os';
import { getLogsDir, createMainLogger } from '../logging/logger';
import { getBackendPort } from '../backend-port';
import { BACKGROUNDS_DIR_NAME } from './background';
import { MASCOT_SPRITES_DIR_NAME } from '../mascot/overlay-state';
import { handle, handleWithFallback } from './with-ipc-handler';
import {
  appGetPathSchema,
  appGetVersionSchema,
  appGetSystemInfoSchema,
  appClipboardWriteSchema,
  appClipboardWriteImageSchema,
  appSaveFileBinarySchema,
  appGetAutoLaunchSchema,
  appSetAutoLaunchSchema,
  appGetBackendPortSchema,
  appRelaunchSchema,
  appClearUserFilesSchema,
} from './schemas';
import { registerAppImageFetchHandlers, cleanupAppImageFetchHandlers } from './app-image-fetch';
import { registerAppLogHandlers, cleanupAppLogHandlers } from './app-logs';

const logger = createMainLogger('IPC:App');

/**
 * Register app-related IPC handlers
 */
export function registerAppHandlers(): void {
  const ALLOWED_PATH_NAMES = new Set([
    'userData',
    'home',
    'documents',
    'downloads',
    'desktop',
    'logs',
    'temp',
  ]);

  handleWithFallback(
    'app:get-path',
    (_event, name) => {
      if (!ALLOWED_PATH_NAMES.has(name)) {
        logger.warn(`[security] Blocked app:get-path for non-whitelisted name: "${name}"`);
        return undefined;
      }
      logger.debug(`app:get-path invoked for "${name}"`);
      return app.getPath(name as Parameters<typeof app.getPath>[0]);
    },
    () => undefined,
    { schema: appGetPathSchema }
  );

  handle(
    'app:get-version',
    () => {
      logger.debug('app:get-version invoked');
      return app.getVersion();
    },
    { schema: appGetVersionSchema }
  );

  handleWithFallback(
    'app:get-system-info',
    () => {
      logger.debug('app:get-system-info invoked');
      // getGPUFeatureStatus can throw very early in startup; guard so diagnostics
      // still render a best-effort payload.
      let gpuFeatureStatus: Record<string, string> | { error: string };
      try {
        gpuFeatureStatus = app.getGPUFeatureStatus() as unknown as Record<string, string>;
      } catch (err) {
        gpuFeatureStatus = { error: err instanceof Error ? err.message : String(err) };
      }
      return {
        appVersion: app.getVersion(),
        electronVersion: process.versions.electron ?? 'unknown',
        chromeVersion: process.versions.chrome ?? 'unknown',
        nodeVersion: process.versions.node ?? 'unknown',
        osPlatform: process.platform,
        osRelease: osRelease(),
        arch: process.arch,
        userDataPath: app.getPath('userData'),
        logsPath: getLogsDir(),
        gpuFeatureStatus,
      };
    },
    () => ({
      appVersion: 'unknown',
      electronVersion: 'unknown',
      chromeVersion: 'unknown',
      nodeVersion: 'unknown',
      osPlatform: process.platform,
      osRelease: 'unknown',
      arch: process.arch,
      userDataPath: '',
      logsPath: '',
      gpuFeatureStatus: { error: 'unavailable' } as Record<string, string> | { error: string },
    }),
    { schema: appGetSystemInfoSchema }
  );

  handle(
    'app:clipboard-write',
    (_event, text) => {
      clipboard.writeText(text);
    },
    { schema: appClipboardWriteSchema }
  );

  handle(
    'app:clipboard-write-image',
    (_event, pngBase64) => {
      const image = nativeImage.createFromBuffer(Buffer.from(pngBase64, 'base64'));
      if (image.isEmpty()) {
        throw new Error('Failed to create image from provided data');
      }
      clipboard.writeImage(image);
    },
    { schema: appClipboardWriteImageSchema }
  );

  handle(
    'app:save-file-binary',
    async (_event, filePath, base64Data) => {
      const resolved = resolve(filePath);
      const allowedDirs = [
        app.getPath('documents'),
        app.getPath('downloads'),
        app.getPath('desktop'),
        app.getPath('pictures'),
      ];
      const isAllowed = allowedDirs.some(dir => resolved.startsWith(dir + sep) || resolved === dir);
      if (!isAllowed) {
        logger.warn(`[security] Blocked save-file-binary outside allowed directories: ${resolved}`);
        throw new Error('File path outside allowed directories');
      }
      await writeFile(resolved, Buffer.from(base64Data, 'base64'));
      return { success: true };
    },
    { schema: appSaveFileBinarySchema }
  );

  handle(
    'app:get-auto-launch',
    () => {
      logger.debug('app:get-auto-launch invoked');
      return app.getLoginItemSettings().openAtLogin;
    },
    { schema: appGetAutoLaunchSchema }
  );

  handle(
    'app:set-auto-launch',
    (_event, enabled) => {
      logger.debug(`app:set-auto-launch invoked: ${enabled}`);
      app.setLoginItemSettings({ openAtLogin: enabled });
      return app.getLoginItemSettings().openAtLogin;
    },
    { schema: appSetAutoLaunchSchema }
  );

  handle(
    'app:get-backend-port',
    () => {
      logger.debug('app:get-backend-port invoked');
      return getBackendPort();
    },
    { schema: appGetBackendPortSchema }
  );

  // Delete user-uploaded asset directories under userData (custom backgrounds,
  // mascot sprites) for the "delete all data" factory reset. The DB +
  // electron-store wipes don't touch these on-disk files, so without this they
  // survive a reset as unreferenced dead files. force:true makes a missing dir
  // a no-op; the renderer treats this as a best-effort step.
  handle(
    'app:clear-user-files',
    async () => {
      logger.warn('app:clear-user-files invoked — removing user-uploaded asset directories');
      const userData = app.getPath('userData');
      await Promise.all(
        [BACKGROUNDS_DIR_NAME, MASCOT_SPRITES_DIR_NAME].map(dir =>
          rm(join(userData, dir), { recursive: true, force: true })
        )
      );
    },
    { schema: appClearUserFilesSchema }
  );

  // Relaunch the app from scratch (used by the "delete all data" factory reset
  // to drop all in-memory state after persistence is wiped). app.exit(0) kills
  // the process synchronously, so this handler never returns a value to the
  // renderer — the caller must not await the invoke.
  handle(
    'app:relaunch',
    () => {
      logger.warn('app:relaunch invoked — relaunching application');
      app.relaunch();
      app.exit(0);
    },
    { schema: appRelaunchSchema }
  );

  registerAppImageFetchHandlers();
  registerAppLogHandlers();
}

/**
 * Clean up app-related IPC handlers
 */
export function cleanupAppHandlers(): void {
  ipcMain.removeHandler('app:get-path');
  ipcMain.removeHandler('app:get-version');
  ipcMain.removeHandler('app:get-system-info');
  ipcMain.removeHandler('app:clipboard-write');
  ipcMain.removeHandler('app:clipboard-write-image');
  ipcMain.removeHandler('app:save-file-binary');
  ipcMain.removeHandler('app:get-auto-launch');
  ipcMain.removeHandler('app:set-auto-launch');
  ipcMain.removeHandler('app:get-backend-port');
  ipcMain.removeHandler('app:clear-user-files');
  ipcMain.removeHandler('app:relaunch');

  cleanupAppImageFetchHandlers();
  cleanupAppLogHandlers();
}
