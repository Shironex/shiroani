import { app, BrowserWindow, ipcMain } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { pathToFileURL } from 'url';
import { logger } from '../../logging/logger';
import { showContextMenu, setMenuSelectHandler, type MenuState } from '../context-menu';
import { handleOverlayAction } from '../mascot-actions';
import { isMascotPositionLocked, registerPositionCallbacks } from '../mascot-position';
import { getMascotSize, getSavedPosition, savePosition } from '../overlay-state';
import { ShimejiEngine } from './engine';
import type { ShimejiManifest } from './types';

/**
 * Roam-mode ("Shimeji") overlay: a small transparent always-on-top
 * BrowserWindow that the behavior engine walks around the screen.
 * Cross-platform — this is the only mascot backend on macOS, and the
 * opt-in alternative to the native Win32 overlay on Windows.
 */

let overlayWindow: BrowserWindow | null = null;
let engine: ShimejiEngine | null = null;
let visible = false;

const IPC_CHANNELS = [
  'shimeji:set-ignore-mouse',
  'shimeji:drag-start',
  'shimeji:drag-end',
  'shimeji:click',
  'shimeji:context-menu',
] as const;

function getOverlayHtmlPath(): string {
  if (!app.isPackaged) {
    return path.join(__dirname, '../../src/renderer/shimeji-overlay.html');
  }
  return path.join(app.getAppPath(), 'dist/renderer/shimeji-overlay.html');
}

function getSpriteDir(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'mascot', 'shimeji')
    : path.join(__dirname, '../../resources/mascot/shimeji');
}

function loadManifest(): ShimejiManifest | null {
  try {
    const raw = fs.readFileSync(path.join(getSpriteDir(), 'manifest.json'), 'utf-8');
    return JSON.parse(raw) as ShimejiManifest;
  } catch (error) {
    logger.error('Failed to load shimeji sprite manifest:', error);
    return null;
  }
}

/** Only accept overlay IPC from the overlay window itself. */
function isFromOverlay(event: Electron.IpcMainEvent): boolean {
  return (
    overlayWindow !== null &&
    !overlayWindow.isDestroyed() &&
    event.sender === overlayWindow.webContents
  );
}

function registerIpcHandlers(mainWindow: BrowserWindow | null): void {
  ipcMain.on('shimeji:set-ignore-mouse', (event, ignore: unknown) => {
    if (!isFromOverlay(event) || typeof ignore !== 'boolean') return;
    overlayWindow!.setIgnoreMouseEvents(ignore, { forward: true });
  });

  ipcMain.on('shimeji:drag-start', event => {
    if (!isFromOverlay(event)) return;
    if (isMascotPositionLocked()) return;
    engine?.startDrag();
  });

  ipcMain.on('shimeji:drag-end', event => {
    if (!isFromOverlay(event)) return;
    engine?.endDrag();
  });

  ipcMain.on('shimeji:click', event => {
    if (!isFromOverlay(event)) return;
    engine?.onClick();
  });

  ipcMain.on('shimeji:context-menu', (event, x: unknown, y: unknown) => {
    if (!isFromOverlay(event)) return;
    if (typeof x !== 'number' || typeof y !== 'number') return;
    const state: MenuState = {
      visible,
      positionLocked: isMascotPositionLocked(),
    };
    setMenuSelectHandler((action: string) => handleOverlayAction(action, mainWindow));
    showContextMenu(Math.round(x), Math.round(y), state);
  });
}

function cleanupIpcHandlers(): void {
  for (const channel of IPC_CHANNELS) {
    ipcMain.removeAllListeners(channel);
  }
}

function registerShimejiPositionCallbacks(): void {
  registerPositionCallbacks({
    setPositionLocked: locked => {
      engine?.setPaused(locked);
    },
    getPosition: () => engine?.getPosition() ?? { x: 0, y: 0 },
    setPosition: (x, y) => {
      engine?.teleport(x, y);
    },
    savePosition: () => {
      const pos = engine?.getPosition();
      if (pos && (pos.x !== 0 || pos.y !== 0)) savePosition(pos);
    },
  });
}

export function createShimejiOverlay(mainWindow: BrowserWindow | null): boolean {
  if (overlayWindow && !overlayWindow.isDestroyed()) return true;

  const manifest = loadManifest();
  if (!manifest) return false;

  const size = getMascotSize();

  overlayWindow = new BrowserWindow({
    width: size,
    height: size,
    frame: false,
    transparent: true,
    hasShadow: false,
    show: false,
    skipTaskbar: true,
    resizable: false,
    focusable: false,
    fullscreenable: false,
    alwaysOnTop: true,
    webPreferences: {
      // esbuild emits entry points relative to src/main, so the preload
      // lands at dist/main/mascot/shimeji-preload.js while this bundled
      // code runs from dist/main/index.js.
      preload: path.join(__dirname, 'mascot/shimeji-preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      // Separate session so the main app's restrictive CSP (which strips
      // 'unsafe-inline') doesn't block the overlay's inline script.
      partition: 'mascot-overlay',
    },
  });

  // 'screen-saver' floats above regular always-on-top windows — the mascot
  // should walk over everything except fullscreen Spaces.
  overlayWindow.setAlwaysOnTop(true, 'screen-saver');
  overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: false });
  if (typeof overlayWindow.setHiddenInMissionControl === 'function') {
    overlayWindow.setHiddenInMissionControl(true);
  }

  // Click-through by default; the renderer flips this off only while the
  // cursor is over an opaque sprite pixel.
  overlayWindow.setIgnoreMouseEvents(true, { forward: true });

  engine = new ShimejiEngine(size, {
    onAnimChange: (anim, facing) => {
      if (overlayWindow && !overlayWindow.isDestroyed()) {
        overlayWindow.webContents.send('shimeji:anim', { anim, facing });
      }
    },
    onMove: (x, y) => {
      if (overlayWindow && !overlayWindow.isDestroyed()) {
        overlayWindow.setBounds({ x, y, width: getMascotSize(), height: getMascotSize() });
      }
    },
  });
  engine.environment.setMainWindow(mainWindow);

  registerIpcHandlers(mainWindow);
  registerShimejiPositionCallbacks();

  overlayWindow
    .loadFile(getOverlayHtmlPath())
    .then(() => {
      if (!overlayWindow || overlayWindow.isDestroyed()) return;

      overlayWindow.webContents.send('shimeji:config', {
        spriteDirUrl: pathToFileURL(getSpriteDir()).href,
        manifest,
      });

      // Show without stealing focus (the old macOS overlay's lesson).
      overlayWindow.showInactive();
      visible = true;

      const saved = getSavedPosition();
      engine?.start(saved?.x, saved?.y);
      if (isMascotPositionLocked()) engine?.setPaused(true);
    })
    .catch(error => {
      logger.error('Failed to load shimeji overlay HTML:', error);
    });

  // Never let the overlay take focus (macOS can yank users out of Spaces).
  overlayWindow.on('focus', () => {
    if (overlayWindow && !overlayWindow.isDestroyed()) overlayWindow.blur();
  });

  overlayWindow.on('closed', () => {
    overlayWindow = null;
    visible = false;
    engine?.stop();
    engine = null;
    cleanupIpcHandlers();
  });

  logger.info('Shimeji overlay created');
  return true;
}

export function destroyShimejiOverlay(savePosCallback: () => void): void {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    try {
      savePosCallback();
      overlayWindow.removeAllListeners('closed');
      overlayWindow.destroy();
      logger.info('Shimeji overlay destroyed');
    } catch (error) {
      logger.error('Failed to destroy shimeji overlay:', error);
    }
  }
  overlayWindow = null;
  visible = false;
  engine?.stop();
  engine = null;
  cleanupIpcHandlers();
}

export function isShimejiVisible(): boolean {
  return visible;
}

export function setShimejiVisible(show: boolean): void {
  if (!overlayWindow || overlayWindow.isDestroyed()) return;
  if (show) {
    overlayWindow.showInactive();
  } else {
    overlayWindow.hide();
  }
  visible = show;
  // Don't burn CPU walking around while invisible.
  engine?.setPaused(!show || isMascotPositionLocked());
}

export function getShimejiPosition(): { x: number; y: number } {
  return engine?.getPosition() ?? { x: 0, y: 0 };
}

export function setShimejiPosition(x: number, y: number): void {
  engine?.teleport(x, y);
}

export function setShimejiSize(size: number): void {
  if (!overlayWindow || overlayWindow.isDestroyed() || !engine) return;
  engine.setSize(size);
  const pos = engine.getPosition();
  overlayWindow.setBounds({ x: pos.x, y: pos.y, width: size, height: size });
}

export function saveShimejiPosition(): void {
  const pos = engine?.getPosition();
  if (pos && (pos.x !== 0 || pos.y !== 0)) savePosition(pos);
}

export function hasShimejiOverlay(): boolean {
  return overlayWindow !== null && !overlayWindow.isDestroyed();
}
