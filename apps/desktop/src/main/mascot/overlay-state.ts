import { app, screen } from 'electron';
import { existsSync } from 'fs';
import * as path from 'path';
import { store } from '../store';
import { logger } from '../logging/logger';

/**
 * Image extensions the native overlay can decode. Mirrors the picker dialog
 * filter and the sprite IPC validation so a sprite that slips through with a
 * non-image extension never reaches the renderer/native layer where it would
 * fail silently.
 */
const ALLOWED_SPRITE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp']);

/**
 * Validate that a sprite file is usable: it exists on disk AND carries a
 * recognized image extension. Corrupt/renamed files would otherwise render
 * as nothing in the overlay.
 */
function isValidSpriteFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  if (!ALLOWED_SPRITE_EXTENSIONS.has(ext)) return false;
  return existsSync(filePath);
}

type MascotVisibilityMode = 'always' | 'tray-only';

/**
 * Which overlay backend renders the mascot.
 *  - 'static': the native Win32 GDI+ overlay (bobbing sprite, Windows only)
 *  - 'roam':   the cross-platform Shimeji engine (walks, climbs, reacts)
 * macOS has no native backend, so 'roam' is the only mode there.
 */
export type MascotMode = 'static' | 'roam';

/** Sprite scale mode persisted alongside the custom sprite filename. */
export type MascotSpriteScaleMode = 'contain' | 'cover' | 'stretch';

const DEFAULT_MASCOT_SIZE = 128;

/** Default scale mode when no custom sprite is set or the persisted value is invalid. */
export const DEFAULT_SPRITE_SCALE_MODE: MascotSpriteScaleMode = 'contain';

/** Directory inside `userData` where user-supplied mascot sprites are stored. */
export const MASCOT_SPRITES_DIR_NAME = 'mascot-sprites';

export const MASCOT_FRAME_COUNT = 8;
export const MASCOT_ANIM_INTERVAL = 100;

/**
 * Get the persisted mascot mode. Defaults keep behavior stable per platform:
 * Windows users keep the native static overlay they've always had (roam is
 * opt-in); macOS defaults to roam (its "static" is the same Shimeji overlay
 * with the behavior engine idled — the native backend is Win32-only).
 */
export function getMascotMode(): MascotMode {
  const mode = store.get('settings.mascotMode');
  if (mode === 'roam' || mode === 'static') return mode;
  return process.platform === 'darwin' ? 'roam' : 'static';
}

/**
 * Persist the mascot mode (the caller re-creates the overlay to apply it).
 */
export function setMascotModeStored(mode: MascotMode): void {
  store.set('settings.mascotMode', mode);
}

/**
 * Check if the mascot overlay is enabled in settings.
 */
export function isMascotEnabled(): boolean {
  const enabled = store.get('settings.mascotEnabled');
  return enabled !== false;
}

/**
 * Get the configured mascot size from settings.
 */
export function getMascotSize(): number {
  const size = store.get('settings.mascotSize');
  // The typeof guard matters: a string "100" from a hand-edited store file
  // passes >= / <= via coercion and would flow into pixel math as a string.
  return typeof size === 'number' && size >= 48 && size <= 512 ? size : DEFAULT_MASCOT_SIZE;
}

/**
 * Whether the mascot's bob animation is enabled. Defaults to true so existing
 * users keep the animated mascot they've always had — the toggle is opt-out.
 */
export function isMascotAnimationEnabled(): boolean {
  const enabled = store.get('settings.mascotAnimationEnabled');
  return enabled !== false;
}

/**
 * Persist whether the mascot's bob animation is enabled.
 */
export function setMascotAnimationEnabledStored(enabled: boolean): void {
  store.set('settings.mascotAnimationEnabled', enabled);
}

/**
 * Get the mascot visibility mode.
 */
export function getMascotVisibilityMode(): MascotVisibilityMode {
  const mode = store.get('settings.mascotVisibilityMode');
  return mode === 'tray-only' ? 'tray-only' : 'always';
}

/**
 * Set the mascot visibility mode and persist it.
 */
export function setMascotVisibilityMode(mode: MascotVisibilityMode): void {
  store.set('settings.mascotVisibilityMode', mode);
}

export function getSavedPosition(): { x: number; y: number } | undefined {
  const raw = store.get('settings.mascotPosition') as
    | { x?: unknown; y?: unknown }
    | undefined
    | null;
  if (
    raw &&
    typeof raw === 'object' &&
    typeof raw.x === 'number' &&
    Number.isFinite(raw.x) &&
    typeof raw.y === 'number' &&
    Number.isFinite(raw.y)
  ) {
    return { x: raw.x, y: raw.y };
  }
  return undefined;
}

export function savePosition(pos: { x: number; y: number }): void {
  store.set('settings.mascotPosition', pos);
}

export function deletePosition(): void {
  store.delete('settings.mascotPosition');
}

export function getDefaultPosition(size: number): { x: number; y: number } {
  const primaryDisplay = screen.getPrimaryDisplay();
  const workArea = primaryDisplay.workArea;
  return {
    x: workArea.x + workArea.width - size - 20,
    y: workArea.y + workArea.height - size - 10,
  };
}

// ============================================================================
// Custom sprite — file name + scale mode persistence and resolution
// ============================================================================

/**
 * Get the on-disk directory used for user-supplied mascot sprites.
 *
 * NOTE: this resolves `userData` lazily so test harnesses that override the
 * userData path before the first call still see the override.
 */
export function getMascotSpritesDir(): string {
  return path.join(app.getPath('userData'), MASCOT_SPRITES_DIR_NAME);
}

/**
 * Resolve the bundled default sprite path. Mirrors the lookup used by the
 * Win32 native overlay so a fresh install with no custom sprite still loads
 * the chibi base image.
 */
export function getDefaultSpritePath(): string {
  const resourcesDir = app.isPackaged
    ? path.join(process.resourcesPath, 'mascot')
    : path.join(__dirname, '../../resources/mascot');
  return path.join(resourcesDir, 'chibi_base.png');
}

/**
 * Get the persisted custom sprite filename, or `null` when none is set.
 */
export function getCustomSpriteFileName(): string | null {
  const fileName = store.get('settings.mascotCustomSprite') as string | undefined;
  return typeof fileName === 'string' && fileName.length > 0 ? fileName : null;
}

/**
 * Persist the custom sprite filename. Pass `null` to clear it.
 */
export function setCustomSpriteFileName(fileName: string | null): void {
  if (fileName) {
    store.set('settings.mascotCustomSprite', fileName);
  } else {
    store.delete('settings.mascotCustomSprite');
  }
}

/**
 * Get the persisted scale mode for the active sprite. Falls back to
 * {@link DEFAULT_SPRITE_SCALE_MODE} when nothing is stored or the stored
 * value is not a recognized mode.
 */
export function getActiveSpriteScaleMode(): MascotSpriteScaleMode {
  const mode = store.get('settings.mascotSpriteScaleMode') as string | undefined;
  if (mode === 'contain' || mode === 'cover' || mode === 'stretch') {
    return mode;
  }
  return DEFAULT_SPRITE_SCALE_MODE;
}

/**
 * Persist the scale mode for the active sprite.
 */
export function setActiveSpriteScaleMode(mode: MascotSpriteScaleMode): void {
  store.set('settings.mascotSpriteScaleMode', mode);
}

/**
 * Resolve the absolute path to the sprite the overlay should currently render.
 *
 * If a custom sprite filename is persisted AND the file still exists on disk,
 * the absolute path inside `userData/mascot-sprites/` is returned. Otherwise
 * the bundled default sprite path is returned. This is the single source of
 * truth used both at overlay startup and on live sprite swap.
 */
export function getActiveSpritePath(): string {
  const fileName = getCustomSpriteFileName();
  if (fileName) {
    const candidate = path.join(getMascotSpritesDir(), fileName);
    if (isValidSpriteFile(candidate)) {
      return candidate;
    }
    // The persisted sprite is missing or has an unrecognized format — render
    // the bundled default instead of nothing, and warn so the cause is
    // traceable in logs.
    logger.warn(
      `Custom mascot sprite "${fileName}" is missing or has an invalid format — falling back to the default sprite`
    );
  }
  return getDefaultSpritePath();
}
