/**
 * A fixture `window.electronAPI` for the showcase build. It satisfies the real
 * `ElectronAPI` contract, so tsc flags any drift, and answers from memory:
 * nothing reads the disk, the OS or an account.
 */
import {
  DEFAULT_DISCORD_TEMPLATES,
  DEFAULT_UPDATE_CHANNEL,
  LANGUAGE_STORAGE_KEY,
  UI_LANGUAGE_SETTING_KEY,
  type DiscordRpcSettings,
  type ElectronAPI,
  type MalAuthStatus,
  type NotificationSettings,
} from '@shiroani/shared';
import { version as APP_VERSION } from '../../package.json';
import { frequentSites } from './fixtures/browser';
import { aniListStatus, appStatsSnapshot } from './fixtures/profile';

const FAKE_PORT = 58090;

/** localStorage flags the app mirrors into electron-store; mirrored here too. */
const MIRRORED_FLAGS = ['onboarding-completed', 'support-banner-seen'];

function seedStore(): Map<string, unknown> {
  const store = new Map<string, unknown>([
    ['dock-settings', { hiddenViews: [] }],
    ['quick-access-frequent', frequentSites()],
  ]);
  try {
    const language = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (language) store.set(UI_LANGUAGE_SETTING_KEY, language);
    for (const key of MIRRORED_FLAGS) {
      if (window.localStorage.getItem(key) === 'true') store.set(key, true);
    }
  } catch {
    // localStorage unavailable: the fixture store keeps its defaults.
  }
  return store;
}

const notificationSettings: NotificationSettings = {
  enabled: true,
  leadTimeMinutes: 5,
  quietHours: { enabled: false, start: '23:00', end: '08:00' },
  useSystemSound: true,
  subscriptions: [],
};

const discordSettings: DiscordRpcSettings = {
  enabled: true,
  showAnimeDetails: true,
  showElapsedTime: true,
  useCustomTemplates: false,
  templates: DEFAULT_DISCORD_TEMPLATES,
};

const malStatus: MalAuthStatus = { connected: false };

const noop = () => {};
const unsubscribe = () => noop;
const resolved = <T>(value: T) => Promise.resolve(value);

export function createFakeElectronApi(): ElectronAPI {
  const store = seedStore();

  return {
    window: {
      minimize: noop,
      maximize: noop,
      close: noop,
      isMaximized: () => resolved(false),
      onMaximizedChange: unsubscribe,
      openDevTools: () => resolved(undefined),
    },
    store: {
      get: <T>(key: string) => resolved(store.get(key) as T | undefined),
      set: <T>(key: string, value: T) => {
        store.set(key, value);
        return resolved(undefined);
      },
      delete: (key: string) => {
        store.delete(key);
        return resolved(undefined);
      },
      clear: () => {
        store.clear();
        return resolved(undefined);
      },
    },
    dialog: {
      openDirectory: () => resolved(null),
      openFile: () => resolved(null),
      saveFile: () => resolved(null),
      message: () => resolved(0),
    },
    file: {
      writeJson: () => resolved({ success: false }),
      readJson: () => resolved('{}'),
    },
    background: {
      pick: () => resolved(null),
      remove: () => resolved(undefined),
      getUrl: () => resolved(null),
      // The showcase stores nothing: a dropped image is refused like a non-image.
      addFromBytes: () => resolved({ ok: false, reason: 'not-an-image' }),
    },
    app: {
      getPath: () => resolved(''),
      getVersion: () => resolved(APP_VERSION),
      getSystemInfo: () =>
        resolved({
          appVersion: APP_VERSION,
          electronVersion: '0.0.0',
          chromeVersion: '0.0.0',
          nodeVersion: '0.0.0',
          osPlatform: 'win32',
          osRelease: '0.0.0',
          arch: 'x64',
          userDataPath: 'C:\\showcase\\userData',
          logsPath: 'C:\\showcase\\logs',
          gpuFeatureStatus: {},
        }),
      getBackendPort: () => resolved(FAKE_PORT),
      clipboardWrite: () => resolved(undefined),
      clipboardWriteImage: () => resolved(undefined),
      saveFileBinary: () => resolved({ success: false }),
      fetchImageBase64: () => resolved(null),
      openLogsFolder: () => resolved(undefined),
      listLogFiles: () => resolved([]),
      readLogFile: () => resolved(''),
      getAutoLaunch: () => resolved(false),
      setAutoLaunch: (enabled: boolean) => resolved(enabled),
      setLogLevel: (level: string) => resolved({ ok: true, level }),
      relaunch: () => resolved(undefined),
      clearUserFiles: () => resolved(undefined),
    },
    log: {
      write: () => resolved(undefined),
    },
    browser: {
      toggleAdblock: () => resolved(undefined),
      setFullscreen: () => resolved(undefined),
      getPopupBlockEnabled: () => resolved(true),
      setPopupBlockEnabled: () => resolved(undefined),
      setAdblockWhitelist: () => resolved(undefined),
      clearSession: () => resolved(undefined),
      onNewWindowRequest: unsubscribe,
      onShortcut: unsubscribe,
    },
    updater: {
      checkForUpdates: () => resolved({ enabled: false, channel: DEFAULT_UPDATE_CHANNEL }),
      startDownload: () => resolved(undefined),
      installNow: () => resolved(undefined),
      getChannel: () => resolved(DEFAULT_UPDATE_CHANNEL),
      setChannel: channel => resolved(channel),
      onCheckingForUpdate: unsubscribe,
      onUpdateAvailable: unsubscribe,
      onUpdateNotAvailable: unsubscribe,
      onDownloadProgress: unsubscribe,
      onUpdateDownloaded: unsubscribe,
      onUpdateError: unsubscribe,
      onChannelChanged: unsubscribe,
      onAwaitingArtifacts: unsubscribe,
    },
    notifications: {
      getSettings: () => resolved(notificationSettings),
      updateSettings: updates => resolved({ ...notificationSettings, ...updates }),
      getSubscriptions: () => resolved([]),
      addSubscription: subscription => resolved([subscription]),
      removeSubscription: () => resolved([]),
      toggleSubscription: () => resolved([]),
      isSubscribed: () => resolved(false),
      onClicked: unsubscribe,
    },
    discordRpc: {
      getSettings: () => resolved(discordSettings),
      updateSettings: updates => resolved({ ...discordSettings, ...updates }),
      updatePresence: () => resolved(undefined),
      clearPresence: () => resolved(undefined),
      getStatus: () => resolved('disconnected'),
      onStatusChanged: unsubscribe,
    },
    appStats: {
      getSnapshot: () => resolved(appStatsSnapshot()),
      setWatchingAnime: () => resolved(undefined),
      reset: () => resolved(appStatsSnapshot()),
    },
    overlay: {
      show: () => resolved({ success: true }),
      hide: () => resolved({ success: true }),
      toggle: () => resolved({ success: true, visible: false }),
      getStatus: () => resolved({ enabled: false, visible: false, x: 0, y: 0 }),
      setEnabled: (enabled: boolean) => resolved({ success: true, enabled }),
      isEnabled: () => resolved(false),
      setSize: (size: number) => resolved({ success: true, size }),
      getSize: () => resolved(128),
      setVisibilityMode: (mode: string) => resolved({ success: true, mode }),
      getVisibilityMode: () => resolved('always'),
      setPositionLocked: (locked: boolean) => resolved({ success: true, locked }),
      isPositionLocked: () => resolved(false),
      resetPosition: () => resolved({ success: true }),
      setAnimationEnabled: (enabled: boolean) => resolved({ success: true, enabled }),
      isAnimationEnabled: () => resolved(true),
      pickSprite: () => resolved(null),
      addSpriteFromBytes: () => resolved({ ok: false, reason: 'not-an-image' }),
      removeSprite: () => resolved(undefined),
      getSpriteUrl: () => resolved(null),
      setSpriteScale: mode => resolved({ success: true, mode }),
      getSpriteScale: () => resolved('contain'),
      onNavigate: unsubscribe,
    },
    anilistAuth: {
      connect: () => resolved(aniListStatus()),
      disconnect: () => resolved(undefined),
      getStatus: () => resolved(aniListStatus()),
    },
    malAuth: {
      connect: () => resolved(malStatus),
      disconnect: () => resolved(undefined),
      getStatus: () => resolved(malStatus),
    },
    ipc: {
      invokeWithTimeout: <T>() => Promise.reject<T>(new Error('showcase: ipc is not available')),
      cancellableInvoke: <T>() => ({
        promise: Promise.reject<T>(new Error('showcase: ipc is not available')),
        cancel: noop,
      }),
    },
    platform: 'win32',
  };
}

export function installFakeElectronApi(): void {
  window.electronAPI = createFakeElectronApi();
}
