import { BrowserWindow, screen } from 'electron';
import type { ClimbSurface, Ground, WindowRect } from './types';
import { getWindowRects } from './window-sensor';

/**
 * The mascot's model of the world: the primary display's work area (floor +
 * screen walls, taskbar/dock aware) plus the rects of other apps' windows
 * (climbable walls, walkable roofs). Window rects are polled — enumeration
 * costs a syscall, the engine ticks at 30 fps, so we refresh at most every
 * 500 ms and cache between.
 */

const WINDOW_POLL_INTERVAL_MS = 500;

/** Synthetic id for the main ShiroAni window (sensor excludes our own PID). */
export const MAIN_WINDOW_RECT_ID = -1;

export class Environment {
  private windows: WindowRect[] = [];
  private lastPollTime = 0;
  private mainWindow: BrowserWindow | null = null;

  setMainWindow(win: BrowserWindow | null): void {
    this.mainWindow = win;
  }

  get workArea(): Electron.Rectangle {
    return screen.getPrimaryDisplay().workArea;
  }

  get floorY(): number {
    const wa = this.workArea;
    return wa.y + wa.height;
  }

  /** Poll the window sensor if the cache is stale, then return the rects. */
  getWindows(now: number): WindowRect[] {
    if (now - this.lastPollTime >= WINDOW_POLL_INTERVAL_MS) {
      this.lastPollTime = now;
      const rects = getWindowRects();

      // The sensor excludes our own PID (so the mascot never climbs itself);
      // add the main app window back — climbing ShiroAni is half the fun.
      if (this.mainWindow && !this.mainWindow.isDestroyed() && this.mainWindow.isVisible()) {
        if (!this.mainWindow.isMinimized()) {
          const b = this.mainWindow.getBounds();
          rects.push({ id: MAIN_WINDOW_RECT_ID, ...b });
        }
      }

      // Only windows that intersect the primary work area matter.
      const wa = this.workArea;
      this.windows = rects.filter(
        w => w.x < wa.x + wa.width && w.x + w.width > wa.x && w.y < wa.y + wa.height
      );
    }
    return this.windows;
  }

  findWindowById(id: number, now: number): WindowRect | undefined {
    return this.getWindows(now).find(w => w.id === id);
  }

  /**
   * The y coordinate the mascot's feet should rest on at horizontal center
   * `cx`, given what it's standing on. Returns null when the ground is gone
   * (window closed/moved away) — caller should start a fall.
   */
  groundY(ground: Ground, cx: number, now: number): number | null {
    if (ground.kind === 'floor') return this.floorY;
    const rect = this.findWindowById(ground.rectId, now);
    if (!rect) return null;
    if (cx < rect.x || cx > rect.x + rect.width) return null;
    return rect.y;
  }

  /**
   * Find a climbable vertical surface adjacent to the mascot.
   * `edgeX` is the mascot's leading edge, `feetY` its feet, `dir` walk direction.
   */
  findClimbSurface(
    edgeX: number,
    feetY: number,
    dir: 'left' | 'right',
    now: number
  ): ClimbSurface | null {
    const wa = this.workArea;
    const tolerance = 6;

    if (dir === 'left' && Math.abs(edgeX - wa.x) <= tolerance) {
      return { kind: 'screen', side: 'left' };
    }
    if (dir === 'right' && Math.abs(edgeX - (wa.x + wa.width)) <= tolerance) {
      return { kind: 'screen', side: 'right' };
    }

    for (const w of this.getWindows(now)) {
      // The wall must vertically span the mascot's feet and rise above them.
      if (feetY <= w.y + 20 || feetY > w.y + w.height + tolerance) continue;
      if (dir === 'right' && Math.abs(edgeX - w.x) <= tolerance) {
        return { kind: 'window', side: 'left', rectId: w.id };
      }
      if (dir === 'left' && Math.abs(edgeX - (w.x + w.width)) <= tolerance) {
        return { kind: 'window', side: 'right', rectId: w.id };
      }
    }
    return null;
  }

  /**
   * The x coordinate of a climb surface's wall (where the mascot's leading
   * edge sticks). Returns null when a window surface no longer exists.
   */
  climbWallX(surface: ClimbSurface, now: number): number | null {
    const wa = this.workArea;
    if (surface.kind === 'screen') {
      return surface.side === 'left' ? wa.x : wa.x + wa.width;
    }
    const rect = this.findWindowById(surface.rectId, now);
    if (!rect) return null;
    return surface.side === 'left' ? rect.x : rect.x + rect.width;
  }

  /** Top y of the surface being climbed (where climbing can end). */
  climbTopY(surface: ClimbSurface, now: number): number | null {
    if (surface.kind === 'screen') return this.workArea.y;
    const rect = this.findWindowById(surface.rectId, now);
    return rect ? rect.y : null;
  }

  /**
   * Where a falling mascot (center `cx`, feet falling from `fromY` to `toY`
   * this tick) lands: the highest window top crossed, else the floor when
   * crossed. Returns the ground and its y, or null to keep falling.
   */
  findLanding(
    cx: number,
    fromY: number,
    toY: number,
    now: number
  ): { ground: Ground; y: number } | null {
    let best: { ground: Ground; y: number } | null = null;
    for (const w of this.getWindows(now)) {
      if (cx < w.x || cx > w.x + w.width) continue;
      if (fromY <= w.y && toY >= w.y) {
        if (!best || w.y < best.y) {
          best = { ground: { kind: 'window', rectId: w.id }, y: w.y };
        }
      }
    }
    if (best) return best;
    if (toY >= this.floorY) {
      return { ground: { kind: 'floor' }, y: this.floorY };
    }
    return null;
  }
}
