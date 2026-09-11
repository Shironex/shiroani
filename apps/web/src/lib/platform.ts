/** Whether we're running inside Electron (vs plain browser) */
export const IS_ELECTRON = typeof window !== 'undefined' && !!window.electronAPI;

const platform = IS_ELECTRON ? window.electronAPI?.platform : undefined;

/** Whether the app is running on Windows inside Electron */
export const IS_WINDOWS = IS_ELECTRON && platform === 'win32';

/** Whether the app is running on macOS */
export const IS_MAC =
  platform === 'darwin' ||
  (!IS_ELECTRON &&
    typeof navigator !== 'undefined' &&
    ((navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData
      ?.platform === 'macOS' ||
      /Mac|iPhone|iPad/.test(navigator.platform)));

/**
 * Whether native OS notifications for airing episodes are available.
 *
 * Electron-on-macOS is excluded: Electron 42 moved to the `UNNotification` API,
 * which only displays notifications for a properly code-signed app, and
 * ShiroAni's macOS builds are ad-hoc signed (`mac.identity: "-"`) — which does
 * not qualify. Verified by experiment in
 * docs/migrations/2026-09-11-electron-41-to-44.md.
 *
 * Deliberately keyed off the Electron platform rather than {@link IS_MAC}: that
 * constant also true-matches a plain browser on a Mac via a user-agent
 * heuristic, and the web build's behaviour is unrelated to Electron's signing.
 *
 * Re-enable by restoring this to `true` here and in the matching main-process
 * check (`NotificationHostPort.supportsNativeNotifications`) once the project
 * has an Apple Developer ID.
 */
export const SUPPORTS_NATIVE_NOTIFICATIONS = platform !== 'darwin';
