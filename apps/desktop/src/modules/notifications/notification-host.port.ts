import type { AiringAnime, NotificationSettings } from '@shiroani/shared';

/**
 * Port that the NestJS notifications module uses to talk to the Electron host.
 *
 * The Electron main process registers a concrete implementation at bootstrap
 * (see `main/notifications/notification-host.adapter.ts`). This inverts the
 * dependency so `modules/notifications` does not import from `main/`.
 */
export abstract class NotificationHostPort {
  /**
   * Whether the host can actually display native notifications.
   *
   * Electron 42 moved macOS to the `UNNotification` API, which only shows
   * notifications for a properly code-signed app. ShiroAni ships macOS builds
   * with an ad-hoc signature (`mac.identity: "-"`), which does NOT qualify —
   * verified by experiment, see docs/migrations/2026-09-11-electron-41-to-44.md.
   * Until the project has an Apple Developer ID, macOS returns `false` here so
   * the service never starts a check loop that could only ever fail.
   */
  abstract supportsNativeNotifications(): boolean;

  /**
   * Show a native notification for the given airing entry. Resolves once the
   * notification has been dispatched to the OS (icon fetch may still be in
   * flight on slow networks, but firing proceeds).
   */
  abstract showAiringNotification(
    airing: AiringAnime,
    settings: NotificationSettings
  ): Promise<void>;

  /**
   * Schedule toast notifications via the Windows scheduler (noop on other
   * platforms) so upcoming episodes still fire after the app quits.
   */
  abstract scheduleToastsOnQuit(
    schedule: AiringAnime[],
    settings: NotificationSettings,
    notifyIds: Set<number>,
    sentKeys: Set<string>
  ): Promise<void>;

  /** Clear any pending Windows scheduled toasts. Noop on other platforms. */
  abstract clearScheduledToasts(): Promise<void>;

  /** Emit diagnostics about the Windows toast surface. Noop on other platforms. */
  abstract logScheduledToastDiagnostics(): Promise<void>;
}
