/**
 * Shared Utilities
 */

/** AniList media season enum (also matches the desktop `MediaSeason` union). */
export type AniListSeason = 'WINTER' | 'SPRING' | 'SUMMER' | 'FALL';

/**
 * Current AniList season + year from the local clock. Boundaries match
 * AniList's quirk: WINTER = Jan–Mar, SPRING = Apr–Jun, SUMMER = Jul–Sep,
 * FALL = Oct–Dec. Single source of truth so the desktop anime service and the
 * web discover store can't drift on the month cutoffs.
 */
export function getCurrentAniListSeason(): { year: number; season: AniListSeason } {
  const now = new Date();
  const month = now.getMonth(); // 0-indexed
  const year = now.getFullYear();
  let season: AniListSeason;
  if (month <= 2) season = 'WINTER';
  else if (month <= 5) season = 'SPRING';
  else if (month <= 8) season = 'SUMMER';
  else season = 'FALL';
  return { year, season };
}

/**
 * True if `host` is a private/loopback/link-local literal — defence-in-depth
 * against SSRF via IP-literal URLs (no DNS resolution; the OS fetch races
 * anyway). Single canonical guard shared by every outbound-fetch site (app
 * image proxy, article extractor, RSS fetch, notification cover download).
 */
export function isPrivateHostLiteral(host: string): boolean {
  const normalized = host.trim().toLowerCase();
  if (!normalized) return true;

  const unbracketed =
    normalized.startsWith('[') && normalized.endsWith(']') ? normalized.slice(1, -1) : normalized;

  if (unbracketed === '::1' || unbracketed === '::') return true;
  if (/^f[cd][0-9a-f]{0,2}:/.test(unbracketed)) return true;
  if (/^fe[89ab][0-9a-f]?:/.test(unbracketed)) return true;

  const ipv4 = unbracketed.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [, aStr, bStr] = ipv4;
    const a = Number(aStr);
    const b = Number(bStr);
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
  }

  if (unbracketed === 'localhost' || unbracketed.endsWith('.localhost')) return true;

  return false;
}

/** Fisher–Yates shuffle returning a new array (input left unmodified). */
export function shuffleArray<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Extract a human-readable error message from an unknown error value.
 *
 * @param error - The caught error value (could be anything)
 * @param fallback - Fallback message when error is not an Error instance (default: stringifies the error)
 * @returns A string error message
 */
export function extractErrorMessage(error: unknown, fallback?: string): string {
  if (error instanceof Error) {
    return error.message;
  }
  return fallback ?? String(error);
}

/**
 * Convert a Date to a local ISO date string (YYYY-MM-DD).
 *
 * Uses local timezone (getFullYear/getMonth/getDate) rather than UTC.
 */
export function toLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Get the Monday of the week for the given date (defaults to today).
 *
 * Returns a new Date set to midnight (00:00:00.000) on that Monday.
 * Handles Sunday correctly (JS getDay()=0 maps to the previous Monday).
 */
export function getWeekStart(date?: Date): Date {
  const d = date ? new Date(date) : new Date();
  const dow = d.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Truncate a string to a maximum length, appending an ellipsis if truncated.
 *
 * @param text - The string to truncate
 * @param max - Maximum allowed length (including ellipsis)
 * @param ellipsis - The ellipsis string to append (default: '...')
 */
export function truncate(text: string, max: number, ellipsis = '...'): string {
  if (max <= 0) return '';
  if (text.length <= max) return text;
  if (max <= ellipsis.length) return ellipsis.slice(0, max);
  return text.slice(0, max - ellipsis.length) + ellipsis;
}

/**
 * Normalize an anime title for fuzzy equality: NFKD, strip diacritics,
 * lowercase, collapse punctuation/whitespace runs to single spaces, trim.
 * Unicode-aware so CJK titles survive (an ASCII-only class would normalize
 * every native title to the empty string, making them all "match").
 *
 * The ONE title-matching rule for both processes — the renderer's progress
 * tracking (detected title → library entry) and the desktop MAL backfill
 * (search-hit title → local title). These previously used two divergent
 * implementations, so a title could match in one process and not the other.
 */
export function normalizeAnimeTitle(title: string): string {
  return title
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}
