import { app, screen } from 'electron';
import * as path from 'path';
import { logger } from '../../logging/logger';
import type { WindowRect } from './types';

/**
 * Native addon interface for enumerating other apps' window rects so the
 * mascot can climb them. Per-platform implementations:
 *  - macOS:   CGWindowListCopyWindowInfo (bounds/layer only — reading window
 *             NAMES would trigger the Screen Recording permission prompt, so
 *             we deliberately never do)
 *  - Windows: EnumWindows + DWMWA_EXTENDED_FRAME_BOUNDS
 *
 * The addon excludes windows belonging to our own PID; the environment adds
 * the main app window back explicitly via Electron bounds.
 */
interface WindowSensorAddon {
  getWindows(): WindowRect[];
}

let addon: WindowSensorAddon | null = null;
let loadAttempted = false;

function getAddonPath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'native', 'window_sensor.node');
  }
  return path.join(__dirname, '../../build/Release/window_sensor.node');
}

/** Windows smaller than this are noise (tooltips, badges) — not climbable. */
const MIN_CLIMBABLE_WIDTH = 120;
const MIN_CLIMBABLE_HEIGHT = 90;

/**
 * Enumerate climbable top-level windows. Returns an empty array when the
 * sensor addon is unavailable (engine degrades to screen-edges-only roaming).
 */
export function getWindowRects(): WindowRect[] {
  if (!addon && !loadAttempted) {
    loadAttempted = true;
    try {
      addon = require(getAddonPath()) as WindowSensorAddon;
    } catch {
      logger.info('Window sensor addon unavailable — mascot will climb screen edges only');
    }
  }
  if (!addon) return [];

  try {
    return addon
      .getWindows()
      .map(w => {
        // The Win32 sensor reports physical pixels; Electron's screen space
        // is DIPs. macOS already reports points, which ARE DIPs.
        if (process.platform !== 'win32') return w;
        const dip = screen.screenToDipRect(null, {
          x: w.x,
          y: w.y,
          width: w.width,
          height: w.height,
        });
        return { ...dip, id: w.id };
      })
      .filter(
        w =>
          Number.isFinite(w.x) &&
          Number.isFinite(w.y) &&
          w.width >= MIN_CLIMBABLE_WIDTH &&
          w.height >= MIN_CLIMBABLE_HEIGHT
      );
  } catch (error) {
    logger.error('Window sensor getWindows failed:', error);
    return [];
  }
}

/** Whether window climbing is available (vs screen edges only). */
export function hasWindowSensor(): boolean {
  // Force a load attempt so callers get an accurate answer pre-first-poll.
  if (!loadAttempted) getWindowRects();
  return addon !== null;
}
