/**
 * Main window size / position persistence.
 *
 * The resolve and parse helpers are pure so they can be unit tested with fake
 * display arrays. `createWindowStateSaver` only needs a minimal slice of the
 * BrowserWindow API, so tests can drive it with a plain EventEmitter.
 */

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WindowSizeDefaults {
  width: number;
  height: number;
  minWidth: number;
  minHeight: number;
}

export interface PersistedWindowState {
  bounds: Rect;
  maximized: boolean;
}

/** electron-store keys (dot notation, stored as `window.bounds` / `window.maximized`). */
export const WINDOW_BOUNDS_KEY = 'window.bounds';
export const WINDOW_MAXIMIZED_KEY = 'window.maximized';

export const DEFAULT_WINDOW_SIZE: WindowSizeDefaults = {
  width: 1400,
  height: 900,
  minWidth: 800,
  minHeight: 600,
};

/** Debounce for resize/move bursts (dragging fires dozens of events per second). */
export const WINDOW_STATE_SAVE_DEBOUNCE_MS = 500;

/**
 * How much of the saved rectangle has to be visible on a display for us to
 * trust it. Anything smaller means the monitor was unplugged or rearranged.
 */
const MIN_VISIBLE_PX = 100;

/** Upper bound for any stored coordinate or size. Larger values are garbage. */
const MAX_ABS_COORDINATE = 100_000;

function isSaneNumber(value: unknown): value is number {
  return (
    typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= MAX_ABS_COORDINATE
  );
}

/**
 * Validate the stored bounds. The value is untrusted JSON on disk, so wrong
 * types, NaN, zero/negative sizes and absurd values all mean "nothing saved".
 */
export function parseSavedBounds(value: unknown): Rect | null {
  if (typeof value !== 'object' || value === null) return null;
  const { x, y, width, height } = value as Record<string, unknown>;
  if (!isSaneNumber(x) || !isSaneNumber(y) || !isSaneNumber(width) || !isSaneNumber(height)) {
    return null;
  }
  if (width <= 0 || height <= 0) return null;
  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
  };
}

export function parseSavedMaximized(value: unknown): boolean {
  return value === true;
}

function intersectionSize(a: Rect, b: Rect): { width: number; height: number } {
  const width = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const height = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  return { width: Math.max(0, width), height: Math.max(0, height) };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

/** Size `width` x `height`, clamped to the work area and min size, placed at x/y and pulled onto it. */
function fitToWorkArea(rect: Rect, workArea: Rect, defaults: WindowSizeDefaults): Rect {
  // The min size wins over a tiny work area; Electron enforces minWidth/minHeight anyway.
  const width = Math.max(defaults.minWidth, Math.min(rect.width, workArea.width));
  const height = Math.max(defaults.minHeight, Math.min(rect.height, workArea.height));
  // When the window is larger than the work area, pin it to the top-left corner.
  const x = clamp(rect.x, workArea.x, Math.max(workArea.x, workArea.x + workArea.width - width));
  const y = clamp(rect.y, workArea.y, Math.max(workArea.y, workArea.y + workArea.height - height));
  return { x, y, width, height };
}

function centeredDefault(workArea: Rect, defaults: WindowSizeDefaults): Rect {
  const width = Math.min(defaults.width, workArea.width);
  const height = Math.min(defaults.height, workArea.height);
  return fitToWorkArea(
    {
      x: workArea.x + Math.round((workArea.width - width) / 2),
      y: workArea.y + Math.round((workArea.height - height) / 2),
      width,
      height,
    },
    workArea,
    defaults
  );
}

/**
 * Pick the bounds to open the main window with.
 *
 * - Nothing saved: defaults, centered on the primary display.
 * - Saved rectangle not meaningfully visible on any display (monitor gone,
 *   resolution changed): same as nothing saved.
 * - Otherwise: the display showing most of the window wins; the size is
 *   clamped to its work area (and the min size) and the window is moved fully
 *   onto it.
 */
export function resolveInitialBounds(
  saved: Rect | null,
  workAreas: readonly Rect[],
  primaryWorkArea: Rect,
  defaults: WindowSizeDefaults = DEFAULT_WINDOW_SIZE
): Rect {
  if (!saved) return centeredDefault(primaryWorkArea, defaults);

  let best: Rect | null = null;
  let bestArea = 0;
  for (const workArea of workAreas) {
    const overlap = intersectionSize(saved, workArea);
    if (overlap.width < MIN_VISIBLE_PX || overlap.height < MIN_VISIBLE_PX) continue;
    const area = overlap.width * overlap.height;
    if (area > bestArea) {
      best = workArea;
      bestArea = area;
    }
  }

  if (!best) return centeredDefault(primaryWorkArea, defaults);
  return fitToWorkArea(saved, best, defaults);
}

/** The slice of BrowserWindow the saver needs. */
export interface TrackedWindow {
  on(event: string, listener: () => void): unknown;
  isDestroyed(): boolean;
  isMaximized(): boolean;
  isMinimized(): boolean;
  isFullScreen(): boolean;
  getNormalBounds(): Rect;
}

export interface WindowStateSaver {
  /** Persist the current state right away (no-op while minimized or fullscreen). */
  saveNow(): void;
  /** Cancel any pending debounced save. */
  dispose(): void;
}

/**
 * Keep the persisted state in sync with the window.
 *
 * Only the NORMAL bounds are stored (`getNormalBounds()`), never maximized,
 * minimized or fullscreen geometry. While the window is minimized or
 * fullscreen (including HTML5 video fullscreen) nothing is written, so the
 * last normal state survives and fullscreen is never restored on launch.
 */
export function createWindowStateSaver(
  win: TrackedWindow,
  persist: (state: PersistedWindowState) => void,
  debounceMs: number = WINDOW_STATE_SAVE_DEBOUNCE_MS
): WindowStateSaver {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastSerialized: string | null = null;

  const cancelPending = (): void => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const saveNow = (): void => {
    cancelPending();
    if (win.isDestroyed() || win.isMinimized() || win.isFullScreen()) return;
    const bounds = parseSavedBounds(win.getNormalBounds());
    if (!bounds) return;
    const state: PersistedWindowState = { bounds, maximized: win.isMaximized() };
    const serialized = JSON.stringify(state);
    if (serialized === lastSerialized) return;
    lastSerialized = serialized;
    persist(state);
  };

  const scheduleSave = (): void => {
    cancelPending();
    timer = setTimeout(saveNow, debounceMs);
  };

  win.on('resize', scheduleSave);
  win.on('move', scheduleSave);
  win.on('maximize', saveNow);
  win.on('unmaximize', saveNow);
  // Resize events fire while the fullscreen transition animates; drop any
  // save that was queued before the window reports itself as fullscreen.
  win.on('enter-full-screen', cancelPending);
  win.on('close', saveNow);
  win.on('closed', cancelPending);

  return { saveNow, dispose: cancelPending };
}
