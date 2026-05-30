import type { AnimeEntry } from '@shiroani/shared';
import type { AnimeDetection } from '@/lib/anime-detection';

/**
 * Automatic library progress tracking — pure matching/clamping logic.
 *
 * Wired into the webview event path (see `useWebviewEvents`): when the user is
 * watching a detected anime + episode on a streaming site AND that anime is in
 * their library, we advance the entry's `currentEpisode`. These functions are
 * intentionally side-effect-free so the safety rules (advance-only, clamp to
 * total) are unit-testable in isolation from the store/IPC plumbing.
 */

/**
 * Normalize a title for fuzzy equality: lowercase, strip diacritics, collapse
 * non-alphanumeric runs to single spaces, trim. Lets "Attack On Titan" match an
 * entry stored as "Attack on Titan" / "attack-on-titan".
 */
export function normalizeTitle(title: string): string {
  return title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Find the library entry a detection refers to. Prefers an exact `anilistId`
 * match (only present for anilist.co); otherwise falls back to a normalized
 * match against the entry's title / romaji / native titles. Returns null when
 * no confident match exists.
 */
export function matchEntry(
  entries: readonly AnimeEntry[],
  detection: Pick<AnimeDetection, 'animeTitle' | 'anilistId'>
): AnimeEntry | null {
  if (detection.anilistId !== undefined) {
    const byId = entries.find(e => e.anilistId === detection.anilistId);
    if (byId) return byId;
  }

  const target = normalizeTitle(detection.animeTitle);
  if (!target) return null;

  return (
    entries.find(
      e =>
        normalizeTitle(e.title) === target ||
        (e.titleRomaji !== undefined && normalizeTitle(e.titleRomaji) === target) ||
        (e.titleNative !== undefined && normalizeTitle(e.titleNative) === target)
    ) ?? null
  );
}

/**
 * Compute the new `currentEpisode` for an entry given a freshly-detected
 * episode ordinal. Returns the bumped episode, or null when no bump should
 * happen.
 *
 * Safety rules:
 *  - ADVANCE only: never decrease (a detected episode ≤ current is a no-op).
 *  - Clamp to total: never exceed `entry.episodes` when known.
 *  - Ignore non-finite / non-positive detected values.
 */
export function computeAdvance(entry: AnimeEntry, detectedEpisode: number): number | null {
  if (!Number.isFinite(detectedEpisode) || detectedEpisode <= 0) return null;

  const target = Math.floor(detectedEpisode);
  // Advance-only: must be strictly greater than the stored progress.
  if (target <= entry.currentEpisode) return null;

  // Clamp to the total episode count when it is known.
  const clamped =
    typeof entry.episodes === 'number' && entry.episodes > 0
      ? Math.min(target, entry.episodes)
      : target;

  // Re-check the advance after clamping (current could already equal the total).
  if (clamped <= entry.currentEpisode) return null;

  return clamped;
}
