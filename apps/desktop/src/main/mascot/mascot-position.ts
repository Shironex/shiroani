import { screen } from 'electron';
import { store } from '../store';

const DEFAULT_MASCOT_SIZE = 128;

// These are set by overlay.ts so mascot-position can interact with platform-specific state
// without importing the overlay module's internal variables directly.
let platformSetPositionLocked: ((locked: boolean) => void) | null = null;
let platformGetPosition: (() => { x: number; y: number }) | null = null;
let platformSetPosition: ((x: number, y: number) => void) | null = null;
let platformSavePosition: (() => void) | null = null;

/**
 * Register platform-specific callbacks for position management.
 * Called by overlay.ts after determining the platform.
 */
export function registerPositionCallbacks(callbacks: {
  setPositionLocked: (locked: boolean) => void;
  getPosition: () => { x: number; y: number };
  setPosition: (x: number, y: number) => void;
  savePosition: () => void;
}): void {
  platformSetPositionLocked = callbacks.setPositionLocked;
  platformGetPosition = callbacks.getPosition;
  platformSetPosition = callbacks.setPosition;
  platformSavePosition = callbacks.savePosition;
}

/**
 * Clear platform callbacks (call on overlay destroy).
 */
export function clearPositionCallbacks(): void {
  platformSetPositionLocked = null;
  platformGetPosition = null;
  platformSetPosition = null;
  platformSavePosition = null;
}

/**
 * Get whether the mascot position is locked.
 */
export function isMascotPositionLocked(): boolean {
  return store.get('settings.mascotPositionLocked') === true;
}

/**
 * Set whether the mascot position is locked and persist it.
 */
export function setMascotPositionLocked(locked: boolean): void {
  store.set('settings.mascotPositionLocked', locked);
  if (platformSetPositionLocked) {
    platformSetPositionLocked(locked);
  }
}

/**
 * Get the current position of the mascot overlay.
 */
export function getMascotPosition(): { x: number; y: number } {
  if (platformGetPosition) {
    return platformGetPosition();
  }
  return { x: 0, y: 0 };
}

/**
 * Move the mascot overlay to the specified position.
 */
export function setMascotPosition(x: number, y: number): void {
  if (platformSetPosition) {
    platformSetPosition(x, y);
  }
}

/**
 * Save the current mascot position to the store.
 */
export function saveMascotPosition(): void {
  if (platformSavePosition) {
    platformSavePosition();
  }
}

/**
 * Reset the mascot position to the default (bottom-right of work area).
 */
export function resetMascotPosition(): void {
  store.delete('settings.mascotPosition');
  const primaryDisplay = screen.getPrimaryDisplay();
  const workArea = primaryDisplay.workArea;
  const sizeVal = store.get('settings.mascotSize');
  const size =
    typeof sizeVal === 'number' && sizeVal >= 48 && sizeVal <= 512 ? sizeVal : DEFAULT_MASCOT_SIZE;
  const x = workArea.x + workArea.width - size - 20;
  const y = workArea.y + workArea.height - size - 10;

  if (platformSetPosition) {
    platformSetPosition(x, y);
  }
}
