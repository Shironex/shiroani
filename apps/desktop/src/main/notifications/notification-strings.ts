/**
 * Translated counterparts to the pure helpers in
 * `modules/notifications/notification-logic.ts`. The pure module is shared
 * with renderer-targeted tests that snapshot specific Polish strings, so we
 * intentionally keep its body untouched and route the actual main-process
 * call sites through this thin wrapper instead.
 *
 * Both functions read the active UI language fresh from electron-store via
 * {@link t}, so OS-level notifications fired from the tray (or scheduled to
 * fire post-quit on Windows) automatically pick up language changes without
 * any IPC plumbing.
 */

import type { AiringAnime } from '@shiroani/shared';
import { t } from '../i18n-strings';

/**
 * Resolve the best display title for an airing, with the same preference
 * order as the renderer (`english > romaji > native`) and a translated
 * fallback for the genuinely-empty case.
 */
export function resolveAnimeTitle(media: AiringAnime['media']): string {
  return (
    media.title.english ||
    media.title.romaji ||
    media.title.native ||
    t('notification.unknownAnime')
  );
}

/**
 * Format the notification body for an episode.
 *
 * Mirrors the three branches of `buildNotificationBody` in
 * `modules/notifications/notification-logic.ts`:
 *   - within ±1 minute of airing → "airing now"
 *   - more than 1 minute past    → past tense, with `|minutes|` ago
 *   - future                     → "in N min"
 *
 * We translate at the call site rather than inside the pure function because
 * the pure function is exercised by Jest tests that assert exact Polish
 * literals, and rerouting them through electron-store would also need a
 * mock store in the test environment.
 */
export function buildLocalizedNotificationBody(episode: number, minutesLeft: number): string {
  if (minutesLeft < -1) {
    return t('notification.bodyAiredAgo', { episode, minutes: Math.abs(minutesLeft) });
  }
  if (minutesLeft <= 1) {
    return t('notification.bodyAiringNow', { episode });
  }
  return t('notification.bodyInFuture', { episode, minutes: minutesLeft });
}
