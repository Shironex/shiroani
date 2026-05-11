import { app, Tray, Menu, nativeImage, BrowserWindow } from 'electron';
import * as path from 'path';
import { logger } from './logging/logger';
import { t } from './i18n-strings';

let tray: Tray | null = null;
let trayMainWindow: BrowserWindow | null = null;

function getTrayIconPath(): string {
  const resourcesDir = app.isPackaged
    ? process.resourcesPath
    : path.join(__dirname, '../../resources');

  if (process.platform === 'darwin') {
    // On macOS, use a 16px PNG for proper menu bar sizing.
    return path.join(resourcesDir, 'icon-16.png');
  }

  // On Windows, prefer .ico (multi-resolution, crisp at any DPI).
  // Falls back to 32px PNG if .ico is unavailable.
  const icoPath = path.join(resourcesDir, 'icon.ico');
  return icoPath;
}

function showWindow(win: BrowserWindow): void {
  if (win.isDestroyed()) {
    logger.warn('Tray: attempted to show destroyed window');
    return;
  }
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

export function createTray(mainWindow: BrowserWindow): void {
  const iconPath = getTrayIconPath();
  let icon = nativeImage.createFromPath(iconPath);

  // On macOS, mark as template image so the system renders it correctly
  // in both light and dark menu bar modes.
  if (process.platform === 'darwin') {
    icon = icon.resize({ width: 16, height: 16 });
    icon.setTemplateImage(true);
  }

  tray = new Tray(icon);
  tray.setToolTip('ShiroAni');
  trayMainWindow = mainWindow;

  applyTrayMenu(tray, mainWindow);

  // Click on tray icon shows/focuses the main window
  tray.on('click', () => showWindow(mainWindow));

  logger.info('System tray created');
}

/**
 * Build (or rebuild) the tray context menu for the currently configured UI
 * language. Extracted so we can call it from {@link rebuildTrayMenu} when the
 * user flips the language at runtime — Electron's `Tray` caches the
 * `contextMenu` reference, so changing the underlying dictionary value alone
 * does NOT update the labels Windows / macOS already show on next right-click.
 */
function applyTrayMenu(activeTray: Tray, mainWindow: BrowserWindow): void {
  const contextMenu = Menu.buildFromTemplate([
    {
      label: t('tray.show'),
      click: () => showWindow(mainWindow),
    },
    { type: 'separator' },
    {
      label: t('tray.quit'),
      click: () => app.quit(),
    },
  ]);

  activeTray.setContextMenu(contextMenu);
}

/**
 * Rebuild the tray menu against the current UI language. Called from the
 * store IPC layer when the renderer writes a new value to
 * {@link UI_LANGUAGE_SETTING_KEY} — see `ipc/store.ts`. No-op when the tray
 * has not been created yet (e.g. headless test environment).
 */
export function rebuildTrayMenu(): void {
  if (!tray || !trayMainWindow || trayMainWindow.isDestroyed()) return;
  applyTrayMenu(tray, trayMainWindow);
  logger.debug('Tray menu rebuilt for current UI language');
}

export function destroyTray(): void {
  if (tray) {
    tray.destroy();
    tray = null;
  }
  trayMainWindow = null;
}
