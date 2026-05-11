import { execFile } from 'child_process';
import type { AiringAnime, NotificationSettings } from '@shiroani/shared';
import { computeUpcomingNotifications } from '../../modules/notifications/notification-logic';
import { resolveAnimeTitle, buildLocalizedNotificationBody } from './notification-strings';
import { createMainLogger } from '../logging/logger';

const logger = createMainLogger('WinScheduledNotifications');

/**
 * Windows AppUserModelID used both as the toast scheduler ID and as the value
 * passed to `app.setAppUserModelId()` in main entry. Must match the `appId` in
 * electron-builder.json so the installed Start Menu shortcut is tagged with
 * the same value — Windows silently suppresses toast banners otherwise.
 */
export const APP_ID = 'com.shironex.shiroani';
const POWERSHELL_TIMEOUT_MS = 8000;

/** Escape a string for use inside a PowerShell single-quoted string literal. */
export function escapePowerShellString(s: string): string {
  return s.replace(/'/g, "''");
}

/** Escape special XML characters for toast payload. */
export function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Build a simple toast XML payload with title and body text. */
export function buildToastXml(title: string, body: string): string {
  return [
    '<toast>',
    '<visual>',
    '<binding template="ToastGeneric">',
    `<text>${escapeXml(title)}</text>`,
    `<text>${escapeXml(body)}</text>`,
    '</binding>',
    '</visual>',
    '</toast>',
  ].join('');
}

/** Format a Date as a PowerShell [datetime] literal string. */
function formatPowerShellDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const h = pad(date.getHours());
  const min = pad(date.getMinutes());
  const s = pad(date.getSeconds());
  return `${y}-${m}-${d}T${h}:${min}:${s}`;
}

/** Execute a PowerShell command with hidden window and timeout. */
function runPowerShell(script: string): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', script],
      { timeout: POWERSHELL_TIMEOUT_MS, windowsHide: true },
      (error, stdout, stderr) => {
        if (error) reject(error);
        else resolve({ stdout, stderr });
      }
    );
  });
}

/**
 * Schedule Windows toast notifications for upcoming anime episodes.
 * Called before app quit — fires toasts via the OS even when app is dead.
 */
export async function scheduleToastsOnQuit(
  schedule: AiringAnime[],
  settings: NotificationSettings,
  notifyIds: Set<number>,
  sentKeys: Set<string>
): Promise<number> {
  if (process.platform !== 'win32') return 0;

  const upcoming = computeUpcomingNotifications(schedule, settings, notifyIds, sentKeys);
  if (upcoming.length === 0) {
    logger.info('No upcoming notifications to schedule on quit');
    return 0;
  }

  // Build a single PowerShell script that schedules all toasts
  const lines: string[] = [
    '[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null',
    '[Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom, ContentType = WindowsRuntime] | Out-Null',
    `$notifier = [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('${escapePowerShellString(APP_ID)}')`,
  ];

  for (const { airing, deliveryTime } of upcoming) {
    const title = resolveAnimeTitle(airing.media);
    const minutesLeft = Math.round((airing.airingAt - deliveryTime.getTime() / 1000) / 60);
    const body = buildLocalizedNotificationBody(airing.episode, minutesLeft);
    const xml = buildToastXml(title, body);
    const dateStr = formatPowerShellDate(deliveryTime);
    const tag = `${airing.media.id}_${airing.episode}`;

    lines.push(
      `$xml = New-Object Windows.Data.Xml.Dom.XmlDocument`,
      `$xml.LoadXml('${escapePowerShellString(xml)}')`,
      `$toast = New-Object Windows.UI.Notifications.ScheduledToastNotification($xml, [datetime]'${dateStr}')`,
      `$toast.Tag = '${escapePowerShellString(tag)}'`,
      `$notifier.AddToSchedule($toast)`
    );
  }

  try {
    const script = lines.join('; ');
    await runPowerShell(script);
    logger.info(`Scheduled ${upcoming.length} Windows toast notification(s) on quit`);
    return upcoming.length;
  } catch (error) {
    logger.warn('Failed to schedule Windows toast notifications:', error);
    return 0;
  }
}

/**
 * Log Windows toast notification diagnostics on startup so user-reported
 * "notifications don't show" bugs can be diagnosed straight from the log file.
 *
 * Windows requires the AppUserModelID we use when scheduling toasts to match
 * a registered Start Menu shortcut — otherwise toast banners are silently
 * suppressed even though the API succeeds. Electron has no public getter for
 * the runtime AppID, so we just log the constant we use and verify the
 * matching shortcut exists.
 */
export async function logWindowsToastDiagnostics(): Promise<void> {
  if (process.platform !== 'win32') return;

  logger.info(`Toast scheduler AppID configured as "${APP_ID}"`);

  try {
    const script =
      "Get-StartApps | Where-Object { $_.AppID -like '*shironex*' -or $_.AppID -like '*shiroani*' -or $_.Name -like '*hiroAni*' } | ForEach-Object { \"$($_.Name)|$($_.AppID)\" }";
    const { stdout } = await runPowerShell(script);
    const shortcuts = stdout.trim().split(/\r?\n/).filter(Boolean);

    if (shortcuts.length === 0) {
      logger.warn(
        'No ShiroAni Start Menu shortcut registered with Windows. Toast banners ' +
          'will not display until the app is installed via the official installer ' +
          '(dev mode runs unpackaged and has no shortcut).'
      );
      return;
    }

    logger.info(`Registered Start Menu shortcuts: ${shortcuts.join(', ')}`);
    const hasMatching = shortcuts.some(s => s.endsWith(`|${APP_ID}`));
    if (!hasMatching) {
      logger.warn(
        `No shortcut tagged with AppID "${APP_ID}". Existing shortcut is from an ` +
          'older install — uninstall and reinstall via the latest installer to ' +
          'restore toast banners.'
      );
    }
  } catch (error) {
    logger.warn('Failed to query Start Menu shortcuts for diagnostics:', error);
  }
}

/**
 * Remove all previously scheduled toast notifications for our app.
 * Called on startup so the in-app system takes over.
 */
export async function clearScheduledToasts(): Promise<void> {
  if (process.platform !== 'win32') return;

  const script = [
    '[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null',
    `$notifier = [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('${escapePowerShellString(APP_ID)}')`,
    '$scheduled = $notifier.GetScheduledToastNotifications()',
    'foreach ($toast in $scheduled) { $notifier.RemoveFromSchedule($toast) }',
  ].join('; ');

  try {
    await runPowerShell(script);
    logger.info('Cleared previously scheduled Windows toast notifications');
  } catch (error) {
    logger.warn('Failed to clear scheduled Windows toasts:', error);
  }
}
