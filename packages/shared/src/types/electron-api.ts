/**
 * Electron API types shared between the desktop preload and the web renderer.
 *
 * The `ElectronAPI` interface is the single source of truth for the
 * `contextBridge.exposeInMainWorld('electronAPI', ...)` shape. The preload in
 * `apps/desktop` implements it; the renderer in `apps/web` augments `Window`
 * with `electronAPI?: ElectronAPI` (optional at the top level because the
 * bundle may also load in a plain-browser context during tests).
 */

import type {
  UpdateInfo,
  UpdateDownloadProgress,
  UpdateChannel,
  UpdateAwaitingArtifactsInfo,
} from './updater';
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
 * Scale mode for the user-supplied mascot sprite. Mirrors CSS `object-fit`
 * so the Settings preview and the native overlay agree on intent:
 *   - `contain`: preserve aspect ratio, letterbox transparently to fit.
 *   - `cover`:   preserve aspect ratio, crop to fill the square.
 *   - `stretch`: ignore aspect ratio (fastest path; legacy behaviour).
 */
export type MascotSpriteScaleMode = 'contain' | 'cover' | 'stretch';

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
    /** Wipe every persisted setting (factory reset). */
    clear: () => Promise<void>;
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
    /**
     * Relaunch the application from scratch. Fire-and-forget: the main process
     * calls `app.relaunch()` then `app.exit(0)`, so the returned promise never
     * resolves (the process is gone) — callers must not `await` it.
     */
    relaunch: () => Promise<void>;
    /**
     * Delete user-uploaded asset directories under userData (custom backgrounds,
     * mascot sprites) as part of the "delete all data" factory reset.
     */
    clearUserFiles: () => Promise<void>;
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
    /** Wipe the built-in browser session: cookies, logins, cache, storage (factory reset). */
    clearSession: () => Promise<void>;
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
    /**
     * Fires when the GitHub release tag exists but its platform binaries
     * (latest.yml, .exe, .dmg, .blockmap, etc.) are still being uploaded by
     * CI. Renderer should switch to a non-destructive "still uploading" UI
     * and wait — the main process will retry on an exponential backoff and
     * emit `update-available` once the artifacts land.
     */
    onAwaitingArtifacts: (callback: (info: UpdateAwaitingArtifactsInfo) => void) => () => void;
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
    /** Persist + apply whether the mascot's bob animation is enabled. */
    setAnimationEnabled: (
      enabled: boolean
    ) => Promise<{ success: boolean; enabled?: boolean; error?: string }>;
    /** Read the persisted "is the bob animation enabled" toggle. */
    isAnimationEnabled: () => Promise<boolean>;
    /**
     * Open a native dialog to pick a custom mascot sprite. Returns the
     * persisted filename and `shiroani-mascot://` URL on success, or `null`
     * when the user cancels. Validation, copy, and live overlay update all
     * happen main-side before this resolves.
     */
    pickSprite: () => Promise<{ fileName: string; url: string } | null>;
    /** Delete a custom sprite file and revert the overlay to the default. */
    removeSprite: (fileName: string) => Promise<void>;
    /** Resolve a persisted sprite filename to a `shiroani-mascot://` URL, or null when missing. */
    getSpriteUrl: (fileName: string) => Promise<string | null>;
    /** Persist + apply a scale mode for the active sprite. */
    setSpriteScale: (
      mode: MascotSpriteScaleMode
    ) => Promise<{ success: boolean; mode: MascotSpriteScaleMode }>;
    /** Read the persisted scale mode for the active sprite. */
    getSpriteScale: () => Promise<MascotSpriteScaleMode>;
    onNavigate: (callback: (view: string) => void) => () => void;
  };
  ipc: {
    invokeWithTimeout: <T>(channel: string, timeout: number, ...args: unknown[]) => Promise<T>;
    cancellableInvoke: <T>(
      channel: string,
      ...args: unknown[]
    ) => { promise: Promise<T>; cancel: () => void };
  };
  platform: NodeJS.Platform;
}
