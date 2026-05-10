import { app, BrowserWindow } from 'electron';
import { autoUpdater } from 'electron-updater';
import * as semver from 'semver';
import { DEFAULT_UPDATE_CHANNEL } from '@shiroani/shared';
import type { UpdateChannel } from '@shiroani/shared';
import type { UpdateInfo as ElectronUpdateInfo } from 'electron-updater';
import type { ProgressInfo } from 'electron-updater';
import { store } from '../store';
import { attachUpdaterLogger, createMainLogger } from '../logging/logger';

const logger = createMainLogger('AutoUpdater');

// Route electron-updater's internal debug output through our file-backed
// logger before any other updater wiring runs. Must be done first so that
// the autoDownload/autoInstallOnAppQuit assignments below and any implicit
// init electron-updater performs on import show up in our logs.
attachUpdaterLogger(autoUpdater);

let updaterEnabled = false;
let currentChannel: UpdateChannel = DEFAULT_UPDATE_CHANNEL;
let updaterInitialized = false;
let mainWindowRef: BrowserWindow | null = null;

// Disable auto download — user controls when to download
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

// ── Awaiting-artifacts retry state ─────────────────────────────────────
// When the release tag exists but its binaries are still being uploaded by
// CI, electron-updater emits `error` with a 404. We surface that as the
// `awaiting-artifacts` UI state and retry on an exponential backoff until
// either the artifacts land (next event resets us) or the total budget
// runs out (~30 min) and we fall back to idle.
const RETRY_BACKOFF_MS: readonly number[] = [
  30_000, // 30s
  60_000, // 1m
  120_000, // 2m
  300_000, // 5m
  600_000, // 10m  (cap; subsequent attempts also use 10m)
];
const RETRY_BUDGET_MS = 30 * 60 * 1000; // 30 minutes total
let awaitingRetryTimer: NodeJS.Timeout | null = null;
let awaitingRetryAttempt = 0;
let awaitingStartedAt = 0;

function clearAwaitingRetry(): void {
  if (awaitingRetryTimer) {
    clearTimeout(awaitingRetryTimer);
    awaitingRetryTimer = null;
  }
  awaitingRetryAttempt = 0;
  awaitingStartedAt = 0;
}

function scheduleAwaitingRetry(): void {
  if (awaitingRetryTimer) clearTimeout(awaitingRetryTimer);
  const elapsed = Date.now() - awaitingStartedAt;
  if (elapsed >= RETRY_BUDGET_MS) {
    logger.warn(
      `Awaiting-artifacts retry budget exhausted (${Math.round(elapsed / 1000)}s) — giving up and resetting to idle`
    );
    clearAwaitingRetry();
    // Tell the renderer to drop back to idle. We piggyback on
    // `update-not-available` semantics rather than inventing yet another
    // event — the renderer already maps this to status: 'idle'.
    sendToMainWindow('updater:update-not-available', {
      version: app.getVersion(),
      releaseNotes: null,
      releaseDate: new Date().toISOString(),
    });
    return;
  }
  const idx = Math.min(awaitingRetryAttempt, RETRY_BACKOFF_MS.length - 1);
  const delay = RETRY_BACKOFF_MS[idx];
  awaitingRetryAttempt += 1;
  logger.info(
    `Scheduling awaiting-artifacts retry #${awaitingRetryAttempt} in ${Math.round(delay / 1000)}s`
  );
  awaitingRetryTimer = setTimeout(() => {
    awaitingRetryTimer = null;
    if (!updaterEnabled) return;
    void checkForUpdates();
  }, delay);
}

/** Broadcast an IPC event to every open window. Used for the awaiting-artifacts
 *  event to match the channel-changed broadcast pattern. */
function broadcastToAllWindows(channel: string, ...args: unknown[]): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, ...args);
    }
  }
}

function parseReleaseNotes(releaseNotes: ElectronUpdateInfo['releaseNotes']): string | null {
  if (!releaseNotes) return null;
  if (typeof releaseNotes === 'string') return releaseNotes;
  // Array of ReleaseNoteInfo — join all notes
  return releaseNotes
    .map(entry => entry.note)
    .filter(Boolean)
    .join('\n\n');
}

/** Safely send IPC to the main window (guards against destroyed windows) */
function sendToMainWindow(channel: string, ...args: unknown[]): void {
  if (mainWindowRef && !mainWindowRef.isDestroyed()) {
    mainWindowRef.webContents.send(channel, ...args);
  }
}

function getPersistedChannel(): UpdateChannel {
  const stored = store.get('preferences.updateChannel') as string | undefined;
  if (stored === 'stable' || stored === 'beta') return stored;
  return DEFAULT_UPDATE_CHANNEL;
}

function applyChannel(channel: UpdateChannel): void {
  currentChannel = channel;
  autoUpdater.channel = channel === 'beta' ? 'beta' : 'latest';
  autoUpdater.allowPrerelease = channel === 'beta';
  autoUpdater.allowDowngrade = true;
  // Channel switch invalidates any in-flight awaiting-artifacts retry — the
  // pending release we were watching belongs to the previous channel.
  clearAwaitingRetry();
  logger.info(`Update channel set to '${channel}' (autoUpdater.channel='${autoUpdater.channel}')`);
}

export function getUpdateChannel(): UpdateChannel {
  return currentChannel;
}

export async function setUpdateChannel(channel: UpdateChannel): Promise<UpdateChannel> {
  logger.info(`Switching update channel: ${currentChannel} → ${channel}`);
  store.set('preferences.updateChannel', channel);
  applyChannel(channel);
  return channel;
}

export function initializeAutoUpdater(mainWindow: BrowserWindow, isDev: boolean): void {
  // Always update the window reference so existing listeners target the new window
  mainWindowRef = mainWindow;

  if (isDev) {
    logger.info('Skipping auto-updater in development mode');
    updaterEnabled = false;
    return;
  }

  if (process.platform === 'darwin') {
    logger.info(
      'Auto-updater disabled on macOS (unsigned app — users should download updates from GitHub Releases)'
    );
    updaterEnabled = false;
    return;
  }

  updaterEnabled = true;
  applyChannel(getPersistedChannel());

  // Only register listeners and timers once; subsequent calls just update mainWindowRef
  if (updaterInitialized) return;
  updaterInitialized = true;

  // Wire autoUpdater events → renderer via IPC (closures read mainWindowRef)
  autoUpdater.on('checking-for-update', () => {
    logger.info('Checking for update...');
    sendToMainWindow('updater:checking-for-update');
  });

  autoUpdater.on('update-available', (info: ElectronUpdateInfo) => {
    logger.info('Update available:', info.version);
    // Artifacts landed (or weren't missing in the first place) — drop any
    // pending retry so we don't keep polling after the happy path resumes.
    clearAwaitingRetry();
    let isDowngrade = false;
    try {
      isDowngrade = semver.lt(info.version, app.getVersion());
    } catch {
      logger.warn(`Could not compare versions: ${info.version} vs ${app.getVersion()}`);
    }
    sendToMainWindow('updater:update-available', {
      version: info.version,
      releaseNotes: parseReleaseNotes(info.releaseNotes),
      releaseDate: info.releaseDate,
      channel: currentChannel,
      isDowngrade,
    });
  });

  autoUpdater.on('update-not-available', (info: ElectronUpdateInfo) => {
    logger.info('No update available. Current version is up to date:', info.version);
    clearAwaitingRetry();
    sendToMainWindow('updater:update-not-available', {
      version: info.version,
      releaseNotes: parseReleaseNotes(info.releaseNotes),
      releaseDate: info.releaseDate,
    });
  });

  autoUpdater.on('download-progress', (progress: ProgressInfo) => {
    logger.debug(
      `Download progress: ${progress.percent.toFixed(1)}% (${progress.bytesPerSecond} B/s)`
    );
    sendToMainWindow('updater:download-progress', {
      bytesPerSecond: progress.bytesPerSecond,
      percent: progress.percent,
      transferred: progress.transferred,
      total: progress.total,
    });
  });

  autoUpdater.on('update-downloaded', (info: ElectronUpdateInfo) => {
    logger.info('Update downloaded:', info.version);
    clearAwaitingRetry();
    sendToMainWindow('updater:update-downloaded', {
      version: info.version,
      releaseNotes: parseReleaseNotes(info.releaseNotes),
      releaseDate: info.releaseDate,
    });
  });

  autoUpdater.on('error', (error: Error) => {
    // Detect "release exists but artifacts aren't there yet" in two flavors:
    //   1. The .yml manifest is missing (initial check after release-tag,
    //      before CI uploads anything).
    //   2. The .yml is present but a binary asset (.exe, .dmg, .zip, .blockmap)
    //      404s — happens when CI finishes uploading the manifest first and
    //      the renderer kicks off `startDownload` mid-upload.
    // electron-updater error strings are not a stable contract, so we keep
    // the regex permissive and ALWAYS log the raw message for drift visibility.
    const message = error.message ?? '';
    const isYmlPending =
      /Cannot find (latest|beta)\.yml/.test(message) ||
      (message.includes('.yml') && message.includes('404'));
    // Match `.<ext>` and `404` in either order — electron-updater can phrase
    // the error as "404 ... ShiroAni-Setup.exe" (manifest path) OR
    // "Cannot download \"…/ShiroAni-Setup.exe\": HTTP 404" (binary asset path).
    const hasAssetExt = /\.(exe|dmg|zip|blockmap|yml)\b/i.test(message);
    const has404 = /\b404\b/.test(message);
    const isAssetPending = hasAssetExt && has404;
    const isReleasePending = isYmlPending || isAssetPending;

    if (isReleasePending) {
      logger.warn(
        `Release artifacts not yet available — build may still be in progress. Raw: ${message}`
      );
      // Track when the awaiting state began so we can enforce the total
      // retry budget across the backoff schedule.
      if (awaitingStartedAt === 0) awaitingStartedAt = Date.now();
      broadcastToAllWindows('updater:awaiting-artifacts', { since: awaitingStartedAt });
      scheduleAwaitingRetry();
    } else {
      logger.error('Auto-updater error:', message);
      sendToMainWindow('updater:error', message);
    }
  });

  // Initial check after a short delay to let the app finish loading
  setTimeout(() => {
    checkForUpdates();
  }, 5000);

  // Periodic checks every hour
  setInterval(
    () => {
      checkForUpdates();
    },
    60 * 60 * 1000
  );
}

export async function checkForUpdates(): Promise<{ enabled: boolean; channel: UpdateChannel }> {
  const channel = currentChannel;
  if (!updaterEnabled) {
    logger.info('Update check skipped — updater not enabled');
    return { enabled: false, channel };
  }
  try {
    logger.info(`Triggering update check on '${channel}' channel...`);
    await autoUpdater.checkForUpdates();
  } catch (error) {
    logger.error('Failed to check for updates:', error);
  }
  return { enabled: true, channel };
}

export async function downloadUpdate(): Promise<void> {
  logger.info('Starting update download...');
  await autoUpdater.downloadUpdate();
}

export function quitAndInstall(): void {
  logger.info('Quitting and installing update...');
  autoUpdater.quitAndInstall();
}
