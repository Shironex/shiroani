/** Animation names — must match the keys in resources/mascot/shimeji/manifest.json. */
export type ShimejiAnim =
  | 'walk'
  | 'climb'
  | 'sit'
  | 'sleep'
  | 'think'
  | 'wave'
  | 'fall'
  | 'dragged'
  | 'land';

export type Facing = 'left' | 'right';

/** Behavior states. Most map 1:1 to an animation; `walk` covers floor and
 * window-top (platform) walking, `climb` covers screen walls and window edges. */
export type ShimejiState = Exclude<ShimejiAnim, never>;

/** A top-level window rect from the platform sensor, in screen coordinates
 * (top-left origin, same space as Electron's `screen` API). */
export interface WindowRect {
  /** Stable per-window id (CGWindowNumber on macOS, HWND on Windows). */
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A vertical surface the mascot can climb. */
export type ClimbSurface =
  | { kind: 'screen'; side: 'left' | 'right' }
  | { kind: 'window'; side: 'left' | 'right'; rectId: number };

/** What the mascot is currently standing on. */
export type Ground = { kind: 'floor' } | { kind: 'window'; rectId: number };

export interface ShimejiManifestAnimation {
  file: string;
  frames: number;
  fps: number;
  loop: boolean;
}

export interface ShimejiManifest {
  frameSize: number;
  animations: Record<string, ShimejiManifestAnimation>;
}
