import { app, BrowserWindow, powerMonitor, protocol } from 'electron';
import { join } from 'path';
import { NestFactory } from '@nestjs/core';
import { type INestApplication } from '@nestjs/common';
import { CustomIoAdapter } from '../modules/kernel/custom-io-adapter';
import { AppModule } from '../modules/app.module';
import { createMainWindow } from './window';
import { cleanupIpcHandlers } from './ipc/register';
import { logger, getLogPath, flushLogs, flushLogsSync, fileTransport } from './logging/logger';
import { initializeAutoUpdater } from './updater';
import { initializeAdblock, shutdownAdblock } from './adblock';
import { corsOriginCallback } from '../modules/kernel/cors.config';
import { NestLoggerAdapter } from '../modules/kernel/nest-logger';
import { LOCALHOST, setLoggerContext, makeCorrelationId } from '@shiroani/shared';
import { setBackendPort } from './backend-port';
import { BrowserManager } from './browser/browser-manager';
import { buildChromeUserAgent } from './user-agent';
import { registerBackgroundProtocol } from './ipc/background';
import { registerMascotSpriteProtocol } from './ipc/sprite';
import {
  initializeNotificationService,
  cleanupNotificationService,
} from './notifications/notification-service';
import { ElectronNotificationHost } from './notifications/notification-host.adapter';
import { ElectronNotificationStore } from './notifications/notification-store.adapter';
import { NotificationHostPort, NotificationStorePort } from '../modules/notifications';
import { AniListTokenPort, MalTokenPort } from '../modules/anime';
import { ElectronAniListTokenAdapter } from './auth/anilist-token.adapter';
import { ElectronMalTokenAdapter } from './auth/mal-token.adapter';
import { APP_ID as WINDOWS_APP_ID } from './notifications/win-scheduled-notifications';
import {
  initializeDiscordRpc,
  cleanupDiscordRpc,
  onWindowBlur,
  onWindowFocus,
  setDiscordRpcWindow,
} from './discord/discord-rpc-service';
import { store } from './store';
import { setPopupBlockEnabled } from './ipc/browser';
import {
  createMascotOverlay,
  destroyMascotOverlay,
  setMainWindow as setMascotMainWindow,
  updateMascotVisibilityForWindowState,
  type MascotWindowState,
} from './mascot/overlay';
import {
  createContextMenuWindow,
  destroyContextMenu,
  setMainWindowRef as setContextMenuMainWindow,
} from './mascot/context-menu';
import { isMascotEnabled } from './mascot/overlay-state';
import { createTray, destroyTray } from './tray';
import { safeCleanup, isHardCrashReason } from './cleanup-utils';
import { appStatsTracker } from './stats/app-stats-tracker';

// Override Electron's default User-Agent so "Electron/<version>" and the app
// name never leak in request headers — some subframe/worker requests bypass
// session.setUserAgent and fall back to this default, which Cloudflare's
// Turnstile fingerprinting catches. Must run before any webContents is
// created (top-level module load is the right spot).
app.userAgentFallback = buildChromeUserAgent();

// Register custom protocol schemes for serving user-supplied assets from
// `userData`. Both schemes share the same privilege envelope so the renderer
// can load images with parity to plain HTTPS sources.
//
// `shiroani-bg://`     — custom background images
// `shiroani-mascot://` — user-uploaded mascot sprites
//
// Must be called before app.ready.
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'shiroani-bg',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      bypassCSP: false,
      stream: true,
    },
  },
  {
    scheme: 'shiroani-mascot',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      bypassCSP: false,
      stream: true,
    },
  },
]);

// Allow E2E tests to isolate userData by setting ELECTRON_USER_DATA_DIR.
// Must run before app.ready so electron-store and other userData consumers
// see the overridden path.
if (process.env.ELECTRON_USER_DATA_DIR) {
  app.setPath('userData', process.env.ELECTRON_USER_DATA_DIR);
}

// Pin the Windows AppUserModelID so scheduled toast notifications resolve to
// the same Start Menu shortcut electron-builder installs (see electron-builder.json
// "appId"). Without this, Windows silently suppresses toast banners because the
// queue's AppID doesn't match any registered shortcut.
if (process.platform === 'win32') {
  app.setAppUserModelId(WINDOWS_APP_ID);
}

// Single-instance lock. Runs before any heavy setup so a second launch
// quits immediately instead of spinning up Nest, browser manager, and
// IPC handlers only to tear them down. Gated on `app.isPackaged` so dev
// builds can coexist with an installed production copy. The
// 'second-instance' listener is registered immediately after acquiring
// the lock so any follow-up launches during module init are not missed.
if (app.isPackaged) {
  const gotSingleInstanceLock = app.requestSingleInstanceLock();
  if (!gotSingleInstanceLock) {
    logger.warn('Another ShiroAni instance is already running; quitting this one.');
    app.exit(0);
  }

  app.on('second-instance', () => {
    logger.info('second-instance event received — focusing existing window');
    if (mainWindow && !mainWindow.isDestroyed()) {
      showMainWindow(mainWindow);
    }
  });
}

export let mainWindow: BrowserWindow | null = null;
let nestApp: INestApplication | null = null;
let isShuttingDown = false;
let cleanupDone = false;
const browserManager = new BrowserManager();

function showMainWindow(win: BrowserWindow): void {
  if (win.isDestroyed()) return;
  if (win.isMinimized()) {
    win.restore();
  }
  win.show();
  win.focus();
}

const appStatsPowerHandlers = {
  suspend: () => {
    appStatsTracker.flush();
    appStatsTracker.pause('suspend');
  },
  resume: () => appStatsTracker.resume('resume'),
  lockScreen: () => {
    appStatsTracker.flush();
    appStatsTracker.pause('lock-screen');
  },
  unlockScreen: () => appStatsTracker.resume('unlock-screen'),
};

function registerAppStatsPowerListeners(): void {
  powerMonitor.on('suspend', appStatsPowerHandlers.suspend);
  powerMonitor.on('resume', appStatsPowerHandlers.resume);
  powerMonitor.on('lock-screen', appStatsPowerHandlers.lockScreen);
  powerMonitor.on('unlock-screen', appStatsPowerHandlers.unlockScreen);
}

function unregisterAppStatsPowerListeners(): void {
  powerMonitor.off('suspend', appStatsPowerHandlers.suspend);
  powerMonitor.off('resume', appStatsPowerHandlers.resume);
  powerMonitor.off('lock-screen', appStatsPowerHandlers.lockScreen);
  powerMonitor.off('unlock-screen', appStatsPowerHandlers.unlockScreen);
}

async function bootstrapNestApp(): Promise<void> {
  try {
    logger.info('Creating NestJS application...');
    const dbPath = join(app.getPath('userData'), 'shiroani.db');
    nestApp = await NestFactory.create(
      AppModule.forRoot({
        dbPath,
        notificationHostProvider: {
          provide: NotificationHostPort,
          useClass: ElectronNotificationHost,
        },
        notificationStoreProvider: {
          provide: NotificationStorePort,
          useClass: ElectronNotificationStore,
        },
        // safeStorage-backed AniList token provider — reads the persisted
        // access token from the main-process token store so AniListClient can
        // authenticate. The token never crosses IPC.
        anilistTokenProvider: {
          provide: AniListTokenPort,
          useClass: ElectronAniListTokenAdapter,
        },
        // safeStorage-backed MAL token provider — reads the persisted access
        // token (lazily refreshing + rotating both tokens when near expiry) from
        // the main-process token store. Neither token crosses IPC.
        malTokenProvider: {
          provide: MalTokenPort,
          useClass: ElectronMalTokenAdapter,
        },
      }),
      {
        logger: new NestLoggerAdapter(fileTransport),
        bufferLogs: true,
      }
    );
    nestApp.flushLogs();
    logger.info('NestJS application created');

    nestApp.useWebSocketAdapter(new CustomIoAdapter(nestApp));

    nestApp.enableCors({
      origin: corsOriginCallback,
      credentials: true,
    });

    logger.info('Starting to listen on dynamic port...');
    await nestApp.listen(0, LOCALHOST);
    const addr = nestApp.getHttpServer().address();
    if (!addr || typeof addr === 'string') {
      throw new Error(`Failed to get server port: address() returned ${JSON.stringify(addr)}`);
    }
    const port = addr.port;
    if (!port || port === 0) {
      throw new Error('OS assigned port 0 — server did not bind successfully');
    }
    setBackendPort(port);
    logger.info(`NestJS server running on port ${port}`);
    logger.info('Log file location:', getLogPath());
  } catch (error) {
    logger.error('Failed to bootstrap NestJS:', error);
    throw error;
  }
}

async function shutdownNestApp(): Promise<void> {
  if (nestApp) {
    logger.info('Shutting down NestJS...');
    await nestApp.close();
    nestApp = null;
    logger.info('NestJS shutdown complete');
  }
}

/** Set up services and event listeners that depend on the main window */
function setupWindowDependentServices(win: BrowserWindow): void {
  const getMascotWindowState = (): MascotWindowState => {
    if (win.isMinimized()) return 'minimized';
    if (win.isVisible()) return 'visible';
    return 'hidden';
  };

  const syncMascotVisibility = (): void => {
    updateMascotVisibilityForWindowState(getMascotWindowState());
  };

  initializeAutoUpdater(win, process.env.NODE_ENV === 'development');
  if (nestApp) {
    initializeNotificationService(win, nestApp);
  }

  // Set up mascot overlay with main window reference
  setMascotMainWindow(win);

  // Let the Discord RPC service push connection-status updates to this window.
  setDiscordRpcWindow(win);

  win.on('close', event => {
    if (process.platform === 'darwin' && !isShuttingDown) {
      // On macOS the red traffic-light button should hide the app instead of
      // destroying the main window. This keeps tray/mascot integrations stable.
      event.preventDefault();
      win.hide();
    } else if (process.platform !== 'darwin') {
      // On Windows/Linux, closing the main window should fully quit the app.
      // Hidden auxiliary windows (e.g. mascot context menu) would otherwise
      // prevent 'window-all-closed' from firing, so we quit explicitly.
      app.quit();
    }
  });

  // Wire window state changes to mascot visibility mode
  win.on('minimize', syncMascotVisibility);
  win.on('restore', syncMascotVisibility);
  win.on('show', syncMascotVisibility);
  win.on('hide', syncMascotVisibility);
  win.on('enter-full-screen', syncMascotVisibility);
  win.on('leave-full-screen', syncMascotVisibility);

  // Discord RPC idle detection on window blur/focus
  win.on('blur', () => onWindowBlur());
  win.on('focus', () => onWindowFocus());

  // Re-bind the tracker on activate so the new BrowserWindow is observed.
  // Safe to call before tracker.start() — it just stashes the reference.
  appStatsTracker.setMainWindow(win);

  // Flush time-spent stats whenever the window goes off-screen so a crash
  // before the next 60s tick still preserves recent activity.
  win.on('hide', () => appStatsTracker.flush());
  win.on('minimize', () => appStatsTracker.flush());
}

async function bootstrap(): Promise<void> {
  // Log security posture at startup
  const isPackaged = app.isPackaged;
  logger.info(`[security] App packaged: ${isPackaged}`);
  if (isPackaged) {
    logger.info(
      '[security] Electron fuses configured at build time (RunAsNode=off, NodeCLIInspect=off, NodeOptions=off)'
    );
  } else {
    logger.info('[security] Running in development mode -- fuses not applied (build-time only)');
  }

  // Register custom protocols for serving user-supplied assets from userData
  registerBackgroundProtocol();
  registerMascotSpriteProtocol();

  await bootstrapNestApp();
  browserManager.init();
  mainWindow = await createMainWindow(browserManager);
  setMascotMainWindow(mainWindow);

  // Initialize Discord Rich Presence (non-blocking, handles Discord not running).
  // The window ref is wired in setupWindowDependentServices below.
  initializeDiscordRpc();

  // Initialize adblocker after window creation, then enable on browser session
  // only if user hasn't explicitly disabled it
  try {
    await initializeAdblock();
    logger.info('Adblocker initialized successfully');

    const browserSettings = store.get('browser-settings') as
      | {
          adblockEnabled?: boolean;
          popupBlockEnabled?: boolean;
          popupBlockMode?: string;
          adblockWhitelist?: unknown;
        }
      | undefined;
    const shouldEnableAdblock = browserSettings?.adblockEnabled !== false;

    if (shouldEnableAdblock) {
      browserManager.enableAdblock();
      logger.info('Adblock enabled on browser session');
    } else {
      logger.info('Adblock disabled per user settings');
    }

    // Push persisted whitelist to the browser session
    if (Array.isArray(browserSettings?.adblockWhitelist)) {
      const hosts = browserSettings.adblockWhitelist.filter(
        (h): h is string => typeof h === 'string'
      );
      browserManager.setAdblockWhitelist(hosts);
    } else {
      browserManager.setAdblockWhitelist([]);
    }

    // Resolve popup block switch — migrate legacy string mode if the boolean
    // shape is missing. 'off' → false, anything else ('smart' | 'strict') → true.
    let popupEnabled: boolean;
    if (typeof browserSettings?.popupBlockEnabled === 'boolean') {
      popupEnabled = browserSettings.popupBlockEnabled;
    } else if (typeof browserSettings?.popupBlockMode === 'string') {
      popupEnabled = browserSettings.popupBlockMode !== 'off';
      // Write migrated shape back so this migration runs at most once.
      const merged = {
        ...browserSettings,
        popupBlockEnabled: popupEnabled,
      } as Record<string, unknown>;
      delete merged.popupBlockMode;
      store.set('browser-settings', merged);
      logger.info(
        `Migrated legacy popupBlockMode="${browserSettings.popupBlockMode}" → popupBlockEnabled=${popupEnabled}`
      );
    } else {
      popupEnabled = true;
    }
    setPopupBlockEnabled(popupEnabled);
  } catch (error) {
    logger.warn('Failed to initialize adblocker:', error);
  }

  // Create the pre-hidden context menu window for the mascot overlay
  // Only create when mascot is enabled to avoid a hidden BrowserWindow
  // that would prevent 'window-all-closed' from firing on Windows/Linux.
  try {
    setContextMenuMainWindow(mainWindow);
    if (isMascotEnabled()) {
      createContextMenuWindow();
    }
  } catch (error) {
    logger.warn('Failed to create context menu window:', error);
  }

  // Create the mascot overlay (native static overlay on Windows,
  // Shimeji roam engine on macOS / opt-in on Windows; non-blocking)
  try {
    createMascotOverlay();
  } catch (error) {
    logger.warn('Failed to create mascot overlay:', error);
  }

  // Set up window-dependent services and event listeners
  setupWindowDependentServices(mainWindow);

  // Start local "time spent in ShiroAni" tracker. Power events hard-cut the
  // session so locked / suspended time is never counted.
  appStatsTracker.start(mainWindow);
  registerAppStatsPowerListeners();

  // Create system tray icon
  try {
    createTray(mainWindow);
  } catch (error) {
    logger.warn('Failed to create system tray:', error);
  }
}

// Global error handling
process.on('uncaughtException', error => {
  logger.error('Uncaught exception:', error);
  // Synchronously drain buffered logs before the process potentially exits.
  flushLogsSync();
});

process.on('unhandledRejection', reason => {
  logger.error('Unhandled rejection:', reason);
  flushLogsSync();
});

// Render-process gone (per app). `reason` drives severity — hard crashes,
// OOM, launch failures, and integrity failures are errors; everything else
// (killed, clean-exit, abnormal-exit, memory-eviction) is a warn.
app.on('render-process-gone', (_event, webContents, details) => {
  const isError = isHardCrashReason(details.reason);
  const payload = {
    reason: details.reason,
    exitCode: details.exitCode,
    url: webContents.getURL(),
  };
  if (isError) {
    logger.error('[render-process-gone]', payload);
    flushLogsSync();
  } else {
    logger.warn('[render-process-gone]', payload);
  }
});

// Child-process gone (utility, GPU, zygote, etc.). Anything that isn't a
// clean exit is treated as an error.
app.on('child-process-gone', (_event, details) => {
  const isError = details.reason !== 'clean-exit';
  const payload = {
    type: details.type,
    reason: details.reason,
    exitCode: details.exitCode,
    name: details.name,
    serviceName: details.serviceName,
  };
  if (isError) {
    logger.error('[child-process-gone]', payload);
    flushLogsSync();
  } else {
    logger.warn('[child-process-gone]', payload);
  }
});

// Deprecated and removed from Electron's type definitions, but the event
// still fires at runtime on some platforms / GPU-driver crash paths. Cast
// to EventEmitter so the strict overloads don't reject the string literal.
// Kept at warn so we don't double-log when 'render-process-gone' also fires.
(app as unknown as NodeJS.EventEmitter).on(
  'gpu-process-crashed',
  (_event: Electron.Event, killed: boolean) => {
    logger.warn('[gpu-process-crashed]', { killed });
  }
);

// Certificate errors are denied by default. We log them as warn so ops can
// spot MITM or misconfigured TLS without changing behavior.
app.on('certificate-error', (event, _webContents, url, error, _certificate, callback) => {
  logger.warn('[certificate-error]', { url, error });
  event.preventDefault();
  callback(false);
});

// Handle SIGINT/SIGTERM (e.g. Ctrl+C in dev) by triggering graceful shutdown
// so that before-quit fires and onModuleDestroy can save state.
// Guard against duplicate signals (concurrently sends SIGTERM after SIGINT).
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    if (isShuttingDown) return;
    logger.info(`Received ${signal}, initiating graceful shutdown...`);
    app.quit();
  });
}

app
  .whenReady()
  .then(() => {
    // Stamp shared logger session context so every subsequent main-process
    // entry (buffer + JSONL file) carries sessionId/appVersion/platform.
    // Renderer stamps its own distinct sessionId from useAppInitialization.
    setLoggerContext({
      sessionId: makeCorrelationId(),
      appVersion: app.getVersion(),
      platform: process.platform,
    });

    return bootstrap();
  })
  .catch(error => {
    logger.error('Failed to bootstrap application:', error);
  });

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', async () => {
  logger.info('App activated');
  if (mainWindow && !mainWindow.isDestroyed()) {
    showMainWindow(mainWindow);
    return;
  }

  // Recreate the main window even if auxiliary mascot/menu windows still exist.
  cleanupIpcHandlers();
  mainWindow = await createMainWindow(browserManager);
  setContextMenuMainWindow(mainWindow);
  setupWindowDependentServices(mainWindow);
  showMainWindow(mainWindow);
});

app.on('before-quit', event => {
  mainWindow = null;

  // Cleanup finished, let the quit proceed
  if (cleanupDone) return;

  // Keep preventing quit until cleanup finishes (handles duplicate signals)
  event.preventDefault();

  // Already started cleanup, just keep preventing
  if (isShuttingDown) return;

  isShuttingDown = true;

  (async () => {
    await safeCleanup(
      'app stats tracker',
      () => {
        unregisterAppStatsPowerListeners();
        appStatsTracker.stop();
      },
      logger
    );
    await safeCleanup('adblock', () => shutdownAdblock(), logger);
    await safeCleanup('system tray', () => destroyTray(), logger);
    await safeCleanup('context menu', () => destroyContextMenu(), logger);
    await safeCleanup('mascot overlay', () => destroyMascotOverlay(), logger);
    await safeCleanup('discord rpc', () => cleanupDiscordRpc(), logger);
    await safeCleanup('notification service', () => cleanupNotificationService(), logger);
    await safeCleanup('log flush', () => flushLogs(), logger);
    if (nestApp) {
      await shutdownNestApp();
    }
  })().finally(() => {
    cleanupDone = true;
    app.quit();
  });
});
