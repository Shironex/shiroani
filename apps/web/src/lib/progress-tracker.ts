import { toast } from 'sonner';
import i18n from '@/lib/i18n';
import { createLogger } from '@shiroani/shared';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { computeAdvance, matchEntry } from '@/lib/progress-tracking';
import type { AnimeDetection } from '@/lib/anime-detection';

const logger = createLogger('ProgressTracker');

/**
 * Wires anime detection into automatic library progress tracking.
 *
 * Called from the same webview event path as presence updates, but kept
 * separate so presence (which fires on every nav/title event) never triggers a
 * library write. A short dwell is required before bumping so a quick navigation
 * past a page doesn't count: we only advance once the same anime+episode has
 * been the detected target continuously for {@link DWELL_MS}.
 *
 * Safety (see `progress-tracking.ts`): advance-only, clamped to total. The
 * confirmation toast fires at most once per (entry, episode) bump.
 */

const DWELL_MS = 8_000;

interface PendingBump {
  key: string;
  detection: AnimeDetection;
  timer: ReturnType<typeof setTimeout>;
}

let pending: PendingBump | null = null;
/** Guards the toast so a re-detection of the same bump doesn't re-notify. */
let lastBumpKey: string | null = null;

function clearPending(): void {
  if (pending) {
    clearTimeout(pending.timer);
    pending = null;
  }
}

/**
 * Feed the latest detection (or null when the active page isn't a recognized
 * anime watch page) into the tracker. Idempotent per detection target.
 */
export function trackDetectedProgress(detection: AnimeDetection | null): void {
  // No detected episode → nothing to track. (Title-only detections, info
  // pages, and the episode-ID-only sites all land here and safely no-op.)
  if (!detection || detection.episode === undefined) {
    clearPending();
    return;
  }

  if (!useSettingsStore.getState().autoTrackProgress) {
    clearPending();
    return;
  }

  const key = `${detection.anilistId ?? detection.animeTitle}#${detection.episode}`;

  // A different target arrived — cancel any stale dwell timer first, so a
  // matched lastBumpKey (early return below) can't leave it running.
  if (pending && pending.key !== key) clearPending();

  // Same target already pending/handled — let the running dwell timer finish.
  if (pending?.key === key || lastBumpKey === key) return;

  clearPending();
  pending = {
    key,
    detection,
    timer: setTimeout(() => commitBump(key, detection), DWELL_MS),
  };
}

function commitBump(key: string, detection: AnimeDetection): void {
  pending = null;
  if (detection.episode === undefined) return;
  if (!useSettingsStore.getState().autoTrackProgress) return;

  const entry = matchEntry(useLibraryStore.getState().entries, detection);
  if (!entry) return;

  const next = computeAdvance(entry, detection.episode);
  if (next === null) return;

  lastBumpKey = key;
  logger.debug(`Advancing "${entry.title}" → episode ${next}`);
  useLibraryStore.getState().updateEntry({ id: entry.id, currentEpisode: next });

  toast.success(i18n.t('library:toast.progressTracked', { title: entry.title, episode: next }));
}
