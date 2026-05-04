import { create } from 'zustand';
import { maybeDevtools } from '@/stores/utils/maybeDevtools';
import type {
  UpdateStatus,
  UpdateInfo,
  UpdateDownloadProgress,
  UpdateChannel,
} from '@shiroani/shared';
import {
  createLogger,
  DEFAULT_UPDATE_CHANNEL,
  UPDATE_ERROR_RELEASE_PENDING,
} from '@shiroani/shared';

/**
 * Statuses where an update is mid-flight and the user must NOT switch
 * channels (would silently abandon a download or invalidate a pending
 * install). Mirrors the lock the desktop main process enforces via the
 * awaiting-artifacts retry timer.
 */
const UPDATE_LOCKED_STATUSES: ReadonlySet<UpdateStatus> = new Set([
  'downloading',
  'awaiting-artifacts',
  'ready',
]);

/** True while an update is downloading, awaiting CI artifacts, or ready to install. */
export function isUpdateLocked(status: UpdateStatus): boolean {
  return UPDATE_LOCKED_STATUSES.has(status);
}

const logger = createLogger('UpdateStore');

function isValidChannel(value: unknown): value is UpdateChannel {
  return value === 'stable' || value === 'beta';
}

/**
 * Call an updater API method with standardized guard and error logging.
 * Returns undefined if the updater API is not available.
 */
function callUpdaterAPI<T>(
  action: string,
  fn: (
    updater: NonNullable<NonNullable<typeof window.electronAPI>['updater']>
  ) => Promise<T> | undefined
): Promise<T | undefined> {
  const updater = window.electronAPI?.updater;
  if (!updater) {
    logger.warn('Updater API not available');
    return Promise.resolve(undefined);
  }
  return (fn(updater) ?? Promise.resolve(undefined))?.catch((err: Error) => {
    logger.error(`Failed to ${action}:`, err.message);
    return undefined;
  });
}

interface UpdateState {
  status: UpdateStatus;
  updateInfo: UpdateInfo | null;
  progress: UpdateDownloadProgress | null;
  error: string | null;
  channel: UpdateChannel;
  isChannelSwitching: boolean;
  /**
   * Epoch ms of the last time the updater confirmed a check result
   * (either `available` or `not-available`). Used by UpdatesSection to
   * render the "last checked" hint.
   */
  lastCheckedAt: number | null;
  /**
   * True once the user clicked "install now" and we're about to hand off
   * to `quitAndInstall`. The splash screen watches this flag and surfaces
   * the updating variant (v3) for the brief window before the app exits.
   */
  isInstalling: boolean;
}

interface UpdateActions {
  checkForUpdates: () => void;
  startDownload: () => void;
  installNow: () => void;
  setChannel: (channel: UpdateChannel) => void;
  initListeners: () => () => void;
}

type UpdateStore = UpdateState & UpdateActions;

export const useUpdateStore = create<UpdateStore>()(
  maybeDevtools(
    (set, get) => ({
      // Initial state
      status: 'idle',
      updateInfo: null,
      progress: null,
      error: null,
      channel: DEFAULT_UPDATE_CHANNEL,
      isChannelSwitching: false,
      lastCheckedAt: null,
      isInstalling: false,

      // Actions
      checkForUpdates: () => {
        set({ status: 'checking', error: null }, undefined, 'update/checkForUpdatesStart');
        callUpdaterAPI('check for updates', updater =>
          updater.checkForUpdates().then(result => {
            if (!result.enabled) {
              logger.info('Auto-updater not enabled (dev mode)');
              set({ status: 'idle', error: null }, undefined, 'update/updaterNotEnabled');
            }
            return result;
          })
        ).catch((err: Error) => {
          set({ status: 'error', error: err.message }, undefined, 'update/checkForUpdatesError');
        });
      },

      startDownload: () => {
        set(
          { status: 'downloading', progress: null, error: null },
          undefined,
          'update/startDownload'
        );
        callUpdaterAPI('start download', updater => updater.startDownload()).catch((err: Error) => {
          set({ status: 'error', error: err.message }, undefined, 'update/downloadError');
        });
      },

      installNow: () => {
        // Only callable from a downloaded "ready" state. Anything earlier
        // (downloading / awaiting-artifacts) means we don't have a valid
        // installer on disk and quitAndInstall would no-op or crash.
        if (get().status !== 'ready') {
          logger.warn(`installNow ignored — status is '${get().status}', expected 'ready'`);
          return;
        }
        // Flip the splash trigger BEFORE the IPC call so the UI flips to
        // the updating variant while electron-updater is tearing down.
        // quitAndInstall is quick (usually <1s) — a dedicated "installing"
        // status would be gilding the lily. We leave status untouched so
        // any concurrent error still renders correctly. If IPC fails we
        // must reset isInstalling, otherwise the splash gets stuck on the
        // updating variant forever (shouldDismiss waits on !isInstalling).
        set({ isInstalling: true }, undefined, 'update/installNowStart');
        callUpdaterAPI('install update', updater => updater.installNow()).catch((err: Error) => {
          set(
            { isInstalling: false, status: 'error', error: err.message },
            undefined,
            'update/installNowError'
          );
        });
      },

      setChannel: (channel: UpdateChannel) => {
        // Block the switch while an update is in flight — swapping
        // `autoUpdater.channel` mid-download silently abandons the
        // in-flight transfer and confuses the install handoff.
        if (isUpdateLocked(get().status)) {
          logger.warn(
            `setChannel('${channel}') ignored — update is locked in status '${get().status}'`
          );
          return;
        }
        set({ isChannelSwitching: true, channel }, undefined, 'update/setChannelStart');
        callUpdaterAPI('set update channel', u =>
          u.setChannel(channel).then(result => {
            const newChannel = isValidChannel(result) ? result : DEFAULT_UPDATE_CHANNEL;
            set(
              {
                channel: newChannel,
                isChannelSwitching: false,
                status: 'idle',
                updateInfo: null,
                progress: null,
                error: null,
              },
              undefined,
              'update/setChannelSuccess'
            );
            // Trigger a re-check on the new channel
            u.checkForUpdates().catch((err: Error) => {
              logger.error('Failed to re-check after channel switch:', err);
            });
            return result;
          })
        ).catch((err: Error) => {
          set(
            { isChannelSwitching: false, status: 'error', error: err.message },
            undefined,
            'update/setChannelError'
          );
        });
      },

      initListeners: () => {
        const updater = window.electronAPI?.updater;
        if (!updater) {
          logger.warn('Updater API not available — skipping listener init');
          return () => {};
        }

        logger.debug('Initializing updater listeners');

        // Fetch initial channel
        updater
          .getChannel()
          .then(ch => {
            const validated = isValidChannel(ch) ? ch : DEFAULT_UPDATE_CHANNEL;
            set({ channel: validated }, undefined, 'update/initialChannel');
          })
          .catch((err: Error) => {
            logger.error('Failed to fetch initial channel:', err);
          });

        const unsubChecking = updater.onCheckingForUpdate(() => {
          set({ status: 'checking', error: null }, undefined, 'update/checking');
        });

        const unsubAvailable = updater.onUpdateAvailable(info => {
          set(
            { status: 'available', updateInfo: info, error: null, lastCheckedAt: Date.now() },
            undefined,
            'update/available'
          );
        });

        const unsubNotAvailable = updater.onUpdateNotAvailable(() => {
          set(
            { status: 'idle', error: null, lastCheckedAt: Date.now() },
            undefined,
            'update/notAvailable'
          );
        });

        const unsubProgress = updater.onDownloadProgress(progress => {
          set({ status: 'downloading', progress }, undefined, 'update/downloadProgress');
        });

        const unsubDownloaded = updater.onUpdateDownloaded(info => {
          set(
            { status: 'ready', updateInfo: info, progress: null },
            undefined,
            'update/downloaded'
          );
        });

        const unsubError = updater.onUpdateError(message => {
          // Defensive fallback for older main-process builds that still emit
          // the RELEASE_PENDING sentinel via `updater:error` instead of the
          // dedicated `updater:awaiting-artifacts` event. Treat both as the
          // same non-destructive UI state.
          if (message === UPDATE_ERROR_RELEASE_PENDING) {
            set(
              { status: 'awaiting-artifacts', error: null },
              undefined,
              'update/awaitingArtifactsFromSentinel'
            );
            return;
          }
          set({ status: 'error', error: message }, undefined, 'update/error');
        });

        const unsubAwaitingArtifacts = updater.onAwaitingArtifacts(() => {
          set({ status: 'awaiting-artifacts', error: null }, undefined, 'update/awaitingArtifacts');
        });

        const unsubChannelChanged = updater.onChannelChanged(newChannel => {
          const validated = isValidChannel(newChannel) ? newChannel : DEFAULT_UPDATE_CHANNEL;
          // Skip if channel already matches (local switch already handled it)
          if (get().channel === validated && !get().error) return;
          set(
            {
              channel: validated,
              status: 'idle',
              updateInfo: null,
              progress: null,
              error: null,
            },
            undefined,
            'update/channelChanged'
          );
          // Re-check for updates on the new channel
          updater.checkForUpdates().catch((err: Error) => {
            logger.error('Failed to re-check after external channel switch:', err);
          });
        });

        return () => {
          logger.debug('Cleaning up updater listeners');
          unsubChecking();
          unsubAvailable();
          unsubNotAvailable();
          unsubProgress();
          unsubDownloaded();
          unsubError();
          unsubAwaitingArtifacts();
          unsubChannelChanged();
        };
      },
    }),
    { name: 'update' }
  )
);
