/**
 * Pure per-site zoom helpers for the in-app browser. Zoom is remembered per
 * hostname as a percentage (100 = original size) and stepped through the same
 * ladder a desktop browser uses. No Zustand, no React, no persistence here: the
 * store composes these into its actions.
 */

/** Map of hostname to zoom percentage. Hosts at 100% are never stored. */
export type ZoomLevels = Record<string, number>;

/** The zoom percentage every site starts at. */
export const DEFAULT_ZOOM_PERCENT = 100;

/** Zoom ladder (percent), matching the steps desktop Chromium offers. */
export const ZOOM_STEPS: readonly number[] = [
  25, 33, 50, 67, 75, 80, 90, 100, 110, 125, 150, 175, 200, 250, 300, 400, 500,
];

export const MIN_ZOOM_PERCENT = ZOOM_STEPS[0];
export const MAX_ZOOM_PERCENT = ZOOM_STEPS[ZOOM_STEPS.length - 1];

/** Upper bound on remembered sites; the least recently changed host is evicted first. */
export const BROWSER_ZOOM_MAX_ENTRIES = 200;

export type ZoomDirection = 'in' | 'out' | 'reset';

/**
 * The zoom action for a key pressed with Ctrl (Cmd on macOS): `=` and `+` zoom
 * in, `-` zooms out, `0` resets. Any other key is not a zoom shortcut.
 */
export function zoomDirectionForKey(key: string): ZoomDirection | null {
  if (key === '=' || key === '+') return 'in';
  if (key === '-') return 'out';
  if (key === '0') return 'reset';
  return null;
}

/**
 * The next zoom percentage from `current` in `direction`. A value between two
 * steps snaps to the neighbouring step, and the ends of the ladder clamp.
 */
export function nextZoomStep(current: number, direction: ZoomDirection): number {
  if (direction === 'reset') return DEFAULT_ZOOM_PERCENT;
  if (direction === 'in') {
    return ZOOM_STEPS.find(step => step > current) ?? MAX_ZOOM_PERCENT;
  }
  for (let i = ZOOM_STEPS.length - 1; i >= 0; i--) {
    if (ZOOM_STEPS[i] < current) return ZOOM_STEPS[i];
  }
  return MIN_ZOOM_PERCENT;
}

/**
 * The key a page's zoom is remembered under: the lowercased hostname of an
 * http(s) URL. Internal pages, `about:` and anything unparsable have no key,
 * so they always render at 100%.
 */
export function zoomHostKey(url: string | null | undefined): string | null {
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
  return parsed.hostname.toLowerCase() || null;
}

/** The remembered zoom percentage for `url`, or 100 when none is stored. */
export function zoomPercentForUrl(levels: ZoomLevels, url: string | null | undefined): number {
  const host = zoomHostKey(url);
  if (!host) return DEFAULT_ZOOM_PERCENT;
  return levels[host] ?? DEFAULT_ZOOM_PERCENT;
}

function isValidPercent(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= MIN_ZOOM_PERCENT &&
    value <= MAX_ZOOM_PERCENT
  );
}

/**
 * Return a new map with `host` set to `percent`. A host back at 100% is
 * removed; any other change moves the host to the newest position so the cap
 * evicts the least recently changed host first.
 */
export function setZoomEntry(
  levels: ZoomLevels,
  host: string,
  percent: number,
  maxEntries: number = BROWSER_ZOOM_MAX_ENTRIES
): ZoomLevels {
  const next: ZoomLevels = {};
  for (const [key, value] of Object.entries(levels)) {
    if (key !== host) next[key] = value;
  }
  if (percent !== DEFAULT_ZOOM_PERCENT && isValidPercent(percent)) {
    next[host] = percent;
  }
  const keys = Object.keys(next);
  for (let i = 0; i < keys.length - maxEntries; i++) {
    delete next[keys[i]];
  }
  return next;
}

/**
 * Validate a persisted zoom map. Defensive: entries with a non-string host, an
 * out-of-range or non-numeric level, or a level of 100% are dropped, and the
 * result is capped (keeping the newest entries).
 */
export function migratePersistedZoomLevels(raw: unknown): ZoomLevels {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  let out: ZoomLevels = {};
  for (const [host, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!host || !isValidPercent(value)) continue;
    out = setZoomEntry(out, host.toLowerCase(), value);
  }
  return out;
}
