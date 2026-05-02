export type UpdateChannel = 'stable' | 'beta';
export const DEFAULT_UPDATE_CHANNEL: UpdateChannel = 'stable';

export interface UpdateInfo {
  version: string;
  releaseNotes: string | null;
  releaseDate: string;
  channel?: UpdateChannel;
  isDowngrade?: boolean;
}

export interface UpdateDownloadProgress {
  bytesPerSecond: number;
  percent: number;
  transferred: number;
  total: number;
}

export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'awaiting-artifacts'
  | 'ready'
  | 'error';

/**
 * Payload for the `updater:awaiting-artifacts` IPC event. Fired when the
 * GitHub release exists but its binary artifacts (.exe / .dmg / .yml) are
 * still being uploaded by CI. The renderer flips into a non-destructive
 * "still uploading" state and waits for the main-process backoff retry to
 * recover automatically.
 */
export interface UpdateAwaitingArtifactsInfo {
  since: number;
}

/**
 * Sentinel error string sent when electron-updater gets a 404 on latest.yml.
 * This typically means the CI release pipeline is still building artifacts.
 */
export const UPDATE_ERROR_RELEASE_PENDING = 'RELEASE_PENDING';
