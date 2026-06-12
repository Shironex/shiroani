import { BrowserWindow } from 'electron';
import { logger } from '../logging/logger';
import { store } from '../store';
import { registerVisibilitySetter } from './mascot-actions';
import { clearPositionCallbacks } from './mascot-position';
import {
  isMascotEnabled,
  getMascotSize,
  getMascotMode,
  setMascotModeStored,
  getMascotVisibilityMode,
  setMascotVisibilityMode,
  isMascotAnimationEnabled,
  setMascotAnimationEnabledStored,
  getDefaultPosition,
  deletePosition,
  getActiveSpritePath,
  getActiveSpriteScaleMode,
  type MascotMode,
  type MascotSpriteScaleMode,
} from './overlay-state';
import {
  createWin32Overlay,
  destroyWin32Overlay,
  isWin32Visible,
  setWin32Visible,
  setWin32Position,
  getWin32Position,
  setWin32Size,
  setWin32Animation,
  setWin32AnimationEnabled,
  saveWin32Position,
  hasWin32Addon,
} from './overlay-windows';
import {
  createShimejiOverlay,
  destroyShimejiOverlay,
  isShimejiVisible,
  setShimejiVisible,
  setShimejiPosition,
  getShimejiPosition,
  setShimejiSize,
  saveShimejiPosition,
  hasShimejiOverlay,
} from './shimeji/shimeji-window';

export type MascotWindowState = 'visible' | 'hidden' | 'minimized';

/** Which backend is currently live (not just configured). */
type ActiveBackend = 'win32' | 'shimeji' | null;

let mainWindow: BrowserWindow | null = null;
let activeBackend: ActiveBackend = null;

/**
 * Set the main window reference so the overlay can interact with it.
 */
export function setMainWindow(win: BrowserWindow): void {
  mainWindow = win;
}

/** The backend the current platform + mode setting selects. */
function resolveBackend(): ActiveBackend {
  if (process.platform === 'darwin') return 'shimeji';
  if (process.platform === 'win32') {
    return getMascotMode() === 'roam' ? 'shimeji' : 'win32';
  }
  return null;
}

/**
 * Set the mascot overlay size and persist it.
 */
export function setMascotSize(size: number): void {
  const clamped = Math.max(48, Math.min(512, Math.round(size)));
  store.set('settings.mascotSize', clamped);
  if (activeBackend === 'shimeji') {
    setShimejiSize(clamped);
  } else {
    setWin32Size(clamped);
  }
}

/**
 * Enable or disable the mascot overlay.
 */
export function setMascotEnabled(enabled: boolean): void {
  store.set('settings.mascotEnabled', enabled);
  if (enabled) {
    createMascotOverlay();
  } else {
    destroyMascotOverlay();
  }
}

/** Get the persisted mascot mode (re-exported for the IPC layer). */
export { getMascotMode };
export type { MascotMode };

/**
 * Persist a new mascot mode and live-swap the overlay backend.
 * No-op on macOS, where roam is the only backend.
 */
export function applyMascotMode(mode: MascotMode): void {
  setMascotModeStored(mode);
  if (process.platform !== 'win32') return;
  if (!isMascotEnabled()) return;

  const desired = resolveBackend();
  if (desired === activeBackend) return;

  destroyMascotOverlay();
  createMascotOverlay();
}

/**
 * Create and display the mascot overlay using the configured backend.
 */
export function createMascotOverlay(): boolean {
  const backend = resolveBackend();
  if (backend === null) {
    logger.info('Mascot overlay is not supported on this platform');
    return false;
  }

  if (!isMascotEnabled()) {
    logger.info('Mascot overlay is disabled in settings');
    return false;
  }

  // Wire up the visibility setter so mascot-actions can show/hide without circular imports
  registerVisibilitySetter(setMascotVisible);

  const created =
    backend === 'shimeji'
      ? createShimejiOverlay(mainWindow)
      : createWin32Overlay(mainWindow, setMascotVisible);
  activeBackend = created ? backend : null;

  if (created) {
    applyVisibilityModeForCurrentWindowState();
  }
  return created;
}

/** Apply tray-only visibility to a freshly created overlay. */
function applyVisibilityModeForCurrentWindowState(): void {
  const mode = getMascotVisibilityMode();
  if (mode !== 'tray-only') return;
  const isMinimized = mainWindow !== null && !mainWindow.isDestroyed() && mainWindow.isMinimized();
  setMascotVisible(isMinimized);
}

/**
 * Save the current mascot position to the store.
 */
export function saveMascotPosition(): void {
  if (activeBackend === 'shimeji') {
    saveShimejiPosition();
  } else {
    saveWin32Position();
  }
}

/**
 * Reset the mascot position to the default (bottom-right of work area).
 */
export function resetMascotPosition(): void {
  deletePosition();
  const size = getMascotSize();
  const { x, y } = getDefaultPosition(size);
  setMascotPosition(x, y);
}

/**
 * Destroy the mascot overlay and release all resources.
 */
export function destroyMascotOverlay(): void {
  clearPositionCallbacks();
  if (activeBackend === 'shimeji' || hasShimejiOverlay()) {
    destroyShimejiOverlay(() => saveMascotPosition());
  }
  if (activeBackend === 'win32' || hasWin32Addon()) {
    destroyWin32Overlay(() => saveWin32Position());
  }
  activeBackend = null;
}

/**
 * Show or hide the mascot overlay.
 */
export function setMascotVisible(visible: boolean): void {
  if (activeBackend === 'shimeji') {
    setShimejiVisible(visible);
  } else {
    setWin32Visible(visible);
  }
}

/**
 * Move the mascot overlay to the specified position.
 */
export function setMascotPosition(x: number, y: number): void {
  if (activeBackend === 'shimeji') {
    setShimejiPosition(x, y);
  } else {
    setWin32Position(x, y);
  }
}

/**
 * Check whether the mascot overlay is currently visible.
 */
export function isMascotVisible(): boolean {
  return activeBackend === 'shimeji' ? isShimejiVisible() : isWin32Visible();
}

/**
 * Get the current position of the mascot overlay.
 */
export function getMascotPosition(): { x: number; y: number } {
  return activeBackend === 'shimeji' ? getShimejiPosition() : getWin32Position();
}

/**
 * Switch the mascot animation to a different sprite sheet (static backend).
 */
export function setMascotAnimation(
  sheetPath: string,
  frameCount: number,
  frameWidth: number,
  intervalMs: number,
  scaleMode?: MascotSpriteScaleMode
): void {
  setWin32Animation(sheetPath, frameCount, frameWidth, intervalMs, scaleMode);
}

/**
 * Push the active sprite (custom or default) and the persisted scale mode
 * to the live overlay. Static (Win32) backend only — roam mode renders the
 * generated animation sheets, not single-image custom sprites. No-op when
 * the native overlay isn't running.
 */
export function applyActiveSprite(): void {
  if (!hasWin32Addon()) return;
  const spritePath = getActiveSpritePath();
  const size = getMascotSize();
  const scaleMode = getActiveSpriteScaleMode();
  setMascotAnimation(spritePath, 1, size, 16, scaleMode);
}

/** Whether any overlay backend is currently live. */
function hasActiveOverlay(): boolean {
  return activeBackend === 'shimeji' ? hasShimejiOverlay() : hasWin32Addon();
}

/**
 * Update mascot visibility based on current window state and visibility mode.
 */
export function updateMascotVisibilityForWindowState(windowState: MascotWindowState): void {
  if (!hasActiveOverlay()) return;
  if (!isMascotEnabled()) return;

  const mode = getMascotVisibilityMode();
  if (mode === 'always') return;

  // "tray-only" mode: show the mascot only when the main window is minimized.
  setMascotVisible(windowState === 'minimized');
}

/**
 * Persist the visibility mode AND immediately apply it based on the current
 * window state. Unlike bare setMascotVisibilityMode() (which only persists
 * to the store), this function ensures the mascot is shown/hidden right away.
 */
export function applyMascotVisibilityMode(mode: 'always' | 'tray-only'): void {
  setMascotVisibilityMode(mode);

  if (!hasActiveOverlay()) return;
  if (!isMascotEnabled()) return;

  if (mode === 'always') {
    setMascotVisible(true);
  } else {
    const isMinimized =
      mainWindow !== null && !mainWindow.isDestroyed() && mainWindow.isMinimized();
    setMascotVisible(isMinimized);
  }
}

/**
 * Persist + apply the mascot animation toggle. Only the static (Win32)
 * backend has a bob animation to kill; the roam engine's motion is its whole
 * point, so the toggle persists but does not affect it.
 */
export function setMascotAnimationEnabled(enabled: boolean): void {
  setMascotAnimationEnabledStored(enabled);
  setWin32AnimationEnabled(enabled);
}

// Re-export from overlay-state
export {
  isMascotEnabled,
  getMascotSize,
  getMascotVisibilityMode,
  setMascotVisibilityMode,
  isMascotAnimationEnabled,
};

// Position lock (re-exported from mascot-position for centralized imports)
export { isMascotPositionLocked, setMascotPositionLocked } from './mascot-position';
