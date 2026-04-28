/**
 * Electron API types shared between the desktop preload and the web renderer.
 *
 * The `ElectronAPI` interface is the single source of truth for the
 * `contextBridge.exposeInMainWorld('electronAPI', ...)` shape. The preload in
 * `apps/desktop` implements it; the renderer in `apps/web` augments `Window`
 * with `electronAPI?: ElectronAPI` (optional at the top level because the
 * bundle may also load in a plain-browser context during tests).
 */

import type { UpdateInfo, UpdateDownloadProgress, UpdateChannel } from './updater';
import type {
  NotificationSettings,
  NotificationSubscription,
  DiscordRpcSettings,
  DiscordPresenceActivity,
} from './anime';
import type { AppStatsSnapshot } from './stats';

/**
 * Structured log entry forwarded from the renderer → main via `app:log-write`.
 */
export interface RendererLogWriteEntry {
  level: 'error' | 'warn' | 'info' | 'debug';
  context: string;
  message: string;
  data?: unknown;
}

/**
 * Snapshot of host/runtime info gathered by the main process for diagnostics.
 * `gpuFeatureStatus` may be an error wrapper if Chromium wasn't ready yet.
 */
export interface SystemInfoSnapshot {
  appVersion: string;
  electronVersion: string;
  chromeVersion: string;
  nodeVersion: string;
  osPlatform: NodeJS.Platform;
  osRelease: string;
  arch: string;
  userDataPath: string;
  logsPath: string;
  gpuFeatureStatus: Record<string, string> | { error: string };
}

export interface ElectronAPI {
  window: {
    minimize: () => void;
    maximize: () => void;
    close: () => void;
    isMaximized: () => Promise<boolean>;
    onMaximizedChange: (callback: (maximized: boolean) => void) => () => void;
    openDevTools: () => Promise<void>;
  };
  store: {
    get: <T>(key: string) => Promise<T | undefined>;
    set: <T>(key: string, value: T) => Promise<void>;
    delete: (key: string) => Promise<void>;
  };
  dialog: {
    openDirectory: (options?: unknown) => Promise<string | null>;
    openFile: (options?: unknown) => Promise<string | null>;
    saveFile: (options?: unknown) => Promise<string | null>;
    message: (options: {
      type?: 'none' | 'info' | 'error' | 'question' | 'warning';
      title?: string;
      message: string;
      detail?: string;
      buttons?: string[];
    }) => Promise<number>;
  };
  file: {
    writeJson: (filePath: string, jsonString: string) => Promise<{ success: boolean }>;
    readJson: (filePath: string) => Promise<string>;
  };
  background: {
    pick: () => Promise<{ fileName: string; url: string } | null>;
    remove: (fileName: string) => Promise<void>;
    getUrl: (fileName: string) => Promise<string | null>;
  };
  app: {
    getPath: (name: string) => Promise<string>;
    getVersion: () => Promise<string>;
    getSystemInfo: () => Promise<SystemInfoSnapshot>;
    getBackendPort: () => Promise<number>;
    clipboardWrite: (text: string) => Promise<void>;
    clipboardWriteImage: (pngBase64: string) => Promise<void>;
    saveFileBinary: (filePath: string, base64Data: string) => Promise<{ success: boolean }>;
    fetchImageBase64: (url: string) => Promise<string | null>;
    openLogsFolder: () => Promise<void>;
    listLogFiles: () => Promise<Array<{ name: string; size: number; lastModified: number }>>;
    readLogFile: (fileName: string) => Promise<string>;
    getAutoLaunch: () => Promise<boolean>;
    setAutoLaunch: (enabled: boolean) => Promise<boolean>;
    setLogLevel: (level: string) => Promise<{ ok: boolean; level: string }>;
  };
  log: {
    /**
     * Forward a log entry from the renderer to the main-process logger.
     * Fire-and-forget: resolves to void and never rejects to the caller so
     * log failures cannot feed back into the renderer logger (loop hazard).
     */
    write: (entry: RendererLogWriteEntry) => Promise<void>;
  };
  browser: {
    toggleAdblock: (enabled: boolean) => Promise<void>;
    setFullscreen: (isFullscreen: boolean) => Promise<void>;
    getPopupBlockEnabled: () => Promise<boolean>;
    setPopupBlockEnabled: (enabled: boolean) => Promise<void>;
    setAdblockWhitelist: (hosts: string[]) => Promise<void>;
    onNewWindowRequest: (callback: (url: string) => void) => () => void;
    onShortcut: (
      callback: (data: { key: string; ctrl?: boolean; shift?: boolean; alt?: boolean }) => void
    ) => () => void;
  };
  updater: {
    checkForUpdates: () => Promise<{ enabled: boolean; channel: UpdateChannel }>;
    startDownload: () => Promise<void>;
    installNow: () => Promise<void>;
    getChannel: () => Promise<UpdateChannel>;
    setChannel: (channel: UpdateChannel) => Promise<UpdateChannel>;
    onCheckingForUpdate: (callback: () => void) => () => void;
    onUpdateAvailable: (callback: (info: UpdateInfo) => void) => () => void;
    onUpdateNotAvailable: (callback: (info: UpdateInfo) => void) => () => void;
    onDownloadProgress: (callback: (progress: UpdateDownloadProgress) => void) => () => void;
    onUpdateDownloaded: (callback: (info: UpdateInfo) => void) => () => void;
    onUpdateError: (callback: (message: string) => void) => () => void;
    onChannelChanged: (callback: (channel: UpdateChannel) => void) => () => void;
  };
  notifications: {
    getSettings: () => Promise<NotificationSettings>;
    updateSettings: (updates: Partial<NotificationSettings>) => Promise<NotificationSettings>;
    getSubscriptions: () => Promise<NotificationSubscription[]>;
    addSubscription: (
      subscription: NotificationSubscription
    ) => Promise<NotificationSubscription[]>;
    removeSubscription: (anilistId: number) => Promise<NotificationSubscription[]>;
    toggleSubscription: (anilistId: number) => Promise<NotificationSubscription[]>;
    isSubscribed: (anilistId: number) => Promise<boolean>;
    onClicked: (callback: (data: { mediaId: number; episode: number }) => void) => () => void;
  };
  discordRpc: {
    getSettings: () => Promise<DiscordRpcSettings>;
    updateSettings: (updates: Partial<DiscordRpcSettings>) => Promise<DiscordRpcSettings>;
    updatePresence: (activity: DiscordPresenceActivity) => Promise<void>;
    clearPresence: () => Promise<void>;
  };
  appStats: {
    /** Current snapshot of local time-spent counters. */
    getSnapshot: () => Promise<AppStatsSnapshot>;
    /**
     * Tell the tracker whether the active browser tab is currently on a
     * recognized anime site. Drives `animeWatchSeconds`.
     */
    setWatchingAnime: (watching: boolean) => Promise<void>;
    /** Wipe all local stats. Returns the fresh (zeroed) snapshot. */
    reset: () => Promise<AppStatsSnapshot>;
  };
  overlay: {
    show: () => Promise<{ success: boolean }>;
    hide: () => Promise<{ success: boolean }>;
    toggle: () => Promise<{ success: boolean; visible: boolean }>;
    getStatus: () => Promise<{ enabled: boolean; visible: boolean; x: number; y: number }>;
    setEnabled: (enabled: boolean) => Promise<{ success: boolean; enabled: boolean }>;
    isEnabled: () => Promise<boolean>;
    setSize: (size: number) => Promise<{ success: boolean; size: number }>;
    getSize: () => Promise<number>;
    setVisibilityMode: (mode: string) => Promise<{ success: boolean; mode: string }>;
    getVisibilityMode: () => Promise<string>;
    setPositionLocked: (locked: boolean) => Promise<{ success: boolean; locked: boolean }>;
    isPositionLocked: () => Promise<boolean>;
    resetPosition: () => Promise<{ success: boolean }>;
    onNavigate: (callback: (view: string) => void) => () => void;
  };
  ipc: {
    invokeWithTimeout: <T>(channel: string, timeout: number, ...args: unknown[]) => Promise<T>;
    cancellableInvoke: <T>(
      channel: string,
      ...args: unknown[]
    ) => { promise: Promise<T>; cancel: () => void };
  };
  /**
   * Player-skip POC bridge — reach into cross-origin video iframes from
   * the main process and seek the playing `<video>` element. Returns rich
   * diagnostic info for the POC dock. See feasibility doc dated 2026-04-28.
   */
  playerSkip: {
    /** Seek the active playing video by `deltaSeconds` (positive or negative). */
    seekRelative: (
      webContentsId: number,
      deltaSeconds: number
    ) => Promise<{
      ok: boolean;
      reason?: string;
      before?: number;
      after?: number;
      frameUrl?: string;
    }>;
    /** Walk the entire frame tree of the webContents and report every `<video>`. */
    probe: (webContentsId: number) => Promise<{
      webContentsId: number;
      topUrl: string;
      frames: Array<{
        url: string;
        origin: string;
        processId: number;
        routingId: number;
        detached: boolean;
        videos: Array<{
          width: number;
          height: number;
          currentTime: number;
          duration: number;
          paused: boolean;
          src: string;
          playing: boolean;
        }>;
        error?: string;
      }>;
      playingFrameIndices: number[];
      startedAt: number;
      durationMs: number;
    }>;
    /**
     * Stretch goal: inject a "Skip +N" button into the playing-video frame's DOM.
     * Returns the frame URL on success. Diagnostic — POC only.
     */
    injectButton: (
      webContentsId: number,
      deltaSeconds: number
    ) => Promise<{ ok: boolean; reason?: string; frameUrl?: string }>;
  };
  platform: NodeJS.Platform;
}
