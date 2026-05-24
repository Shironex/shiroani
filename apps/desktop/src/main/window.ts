import { app, BrowserWindow, Menu, shell, session, type WebContents } from 'electron';
import * as path from 'path';
import { pathToFileURL } from 'url';
import { registerIpcHandlers } from './ipc/register';
import { VITE_DEV_PORT } from '@shiroani/shared';
import { logger } from './logging/logger';
import { getBackendPort } from './backend-port';
import { BrowserManager } from './browser/browser-manager';
import { isExternalUrlAllowed } from './url-utils';
import { isHardCrashReason } from './cleanup-utils';

// Re-export for callers that still pull it from `./window`. The actual
// implementation lives in `./url-utils` so IPC modules can import it
// without creating a `window.ts → ipc/register.ts → ipc/browser.ts →
// window.ts` cycle.
export { isExternalUrlAllowed };

/**
 * Set Content Security Policy for the renderer process
 * This helps prevent XSS attacks and other injection vulnerabilities
 */
function setupContentSecurityPolicy(isDev: boolean, backendPort: number): void {
  // Only apply CSP to the main renderer's own pages, not to webview content.
  // Packaged Windows paths look like `file:///C:/...` — the two-slash glob
  // (`file://*`) does NOT reliably match those, which would silently disable
  // the CSP on prod installs. `file:///*` matches both POSIX (`file:///home/...`)
  // and Windows paths. A `<meta http-equiv="Content-Security-Policy">` tag in
  // `apps/web/index.html` provides a defence-in-depth fallback.
  const urlFilter = isDev
    ? { urls: [`http://localhost:${VITE_DEV_PORT}/*`] }
    : { urls: ['file:///*'] };

  session.defaultSession.webRequest.onHeadersReceived(urlFilter, (details, callback) => {
    // Build CSP directives
    const cspDirectives = [
      // Only allow scripts from same origin (and Vite dev server in dev mode)
      isDev
        ? `script-src 'self' http://localhost:${VITE_DEV_PORT} 'unsafe-inline' 'unsafe-eval'`
        : "script-src 'self'",
      // Allow styles from same origin and inline (needed for CSS-in-JS)
      "style-src 'self' 'unsafe-inline'",
      // Allow images from any HTTPS source (favicons, anime covers, user-browsed sites).
      // Plain `http:` is intentionally omitted — AniList + Google favicon service
      // both use HTTPS, and webview content is served via its own session.
      "img-src 'self' data: blob: shiroani-bg: shiroani-mascot: https:",
      // Allow fonts from same origin
      "font-src 'self' data:",
      // Allow connections to localhost (WebSocket and API) and AniList GraphQL
      isDev
        ? `connect-src 'self' http://localhost:${VITE_DEV_PORT} ws://localhost:${VITE_DEV_PORT} http://localhost:${backendPort} ws://localhost:${backendPort} http://127.0.0.1:${backendPort} ws://127.0.0.1:${backendPort} https://graphql.anilist.co`
        : `connect-src 'self' http://localhost:${backendPort} ws://localhost:${backendPort} http://127.0.0.1:${backendPort} ws://127.0.0.1:${backendPort} https://graphql.anilist.co`,
      // Restrict object/embed sources
      "object-src 'none'",
      // Allow frames from same origin only (webview tags use their own session)
      "frame-src 'self' https:",
      // Allow media from HTTPS sources for video/audio playback
      "media-src 'self' https: blob:",
      // Default to same-origin
      "default-src 'self'",
      // Allow forms to submit to same origin
      "form-action 'self'",
      // Restrict base URI
      "base-uri 'self'",
    ];

    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [cspDirectives.join('; ')],
        'Referrer-Policy': ['no-referrer'],
      },
    });
  });
}

export async function createMainWindow(browserManager: BrowserManager): Promise<BrowserWindow> {
  const isDev = process.env.NODE_ENV === 'development';

  // Set up Content Security Policy before creating the window
  setupContentSecurityPolicy(isDev, getBackendPort());

  // Allow clipboard access, deny all other permission requests (camera, mic, geolocation, etc.)
  const allowedPermissions = new Set(['clipboard-read', 'clipboard-sanitized-write']);

  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    if (allowedPermissions.has(permission)) {
      callback(true);
      return;
    }
    logger.warn(`[security] Denied permission request: ${permission}`);
    callback(false);
  });

  session.defaultSession.setPermissionCheckHandler((_webContents, permission) => {
    if (allowedPermissions.has(permission)) {
      return true;
    }
    logger.debug(`[security] Denied permission check: ${permission}`);
    return false;
  });

  // Remove Electron's default application menu to prevent its built-in
  // Ctrl+W (close window) accelerator from intercepting our browser tab close shortcut.
  // On macOS, keep a minimal menu so standard shortcuts (Cmd+Q, Cmd+C/V) still work.
  if (process.platform === 'darwin') {
    Menu.setApplicationMenu(
      Menu.buildFromTemplate([
        {
          label: app.name,
          submenu: [
            { role: 'about' },
            { type: 'separator' },
            { role: 'hide' },
            { role: 'hideOthers' },
            { role: 'unhide' },
            { type: 'separator' },
            { role: 'quit' },
          ],
        },
        {
          label: 'Edit',
          submenu: [
            { role: 'undo' },
            { role: 'redo' },
            { type: 'separator' },
            { role: 'cut' },
            { role: 'copy' },
            { role: 'paste' },
            { role: 'selectAll' },
          ],
        },
      ])
    );
  } else {
    Menu.setApplicationMenu(null);
  }

  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    title: 'ShiroAni',
    backgroundColor: '#0a0a0f',
    icon: app.isPackaged
      ? path.join(process.resourcesPath, `icon.${process.platform === 'win32' ? 'ico' : 'png'}`)
      : path.join(
          __dirname,
          `../../resources/icon.${process.platform === 'win32' ? 'ico' : 'png'}`
        ),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webviewTag: true, // Enable <webview> tag for built-in browser
    },
  });

  // Security: validate and harden <webview> tags before they attach
  mainWindow.webContents.on('will-attach-webview', (_event, webPreferences, _params) => {
    // Force safe defaults — never trust renderer-supplied values
    webPreferences.nodeIntegration = false;
    webPreferences.nodeIntegrationInSubFrames = false;
    webPreferences.nodeIntegrationInWorker = false;
    webPreferences.contextIsolation = true;
    webPreferences.allowRunningInsecureContent = true; // needed for anime sites with mixed content

    // Strip any preload scripts the renderer might inject
    delete webPreferences.preload;
    delete (webPreferences as Record<string, unknown>).preloadURL;

    // Do NOT force sandbox — macOS sandboxed renderers block cross-origin iframes

    logger.debug('[security] will-attach-webview: webPreferences hardened');
  });

  // Register all IPC handlers
  registerIpcHandlers(mainWindow, browserManager);

  // Per-window crash/health instrumentation. These piggy-back on the same
  // webContents the main window owns and complement the app-level
  // 'render-process-gone' / 'child-process-gone' handlers in main/index.ts
  // with window-scoped context (URL, title, preload path).
  attachWebContentsDiagnostics(mainWindow.webContents);

  // Block all new window creation, open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isExternalUrlAllowed(url)) {
      logger.info(`[security] Blocked new window creation, opening in browser: ${url}`);
      shell.openExternal(url);
    } else {
      logger.warn(`[security] Blocked opening URL with disallowed protocol: ${url}`);
    }
    return { action: 'deny' };
  });

  // Safety net: if a window is somehow created, log it
  mainWindow.webContents.on('did-create-window', window => {
    logger.warn('[security] Unexpected window created -- closing immediately');
    window.close();
  });

  // Block external URL navigation in renderer, open in system browser instead
  const rendererFileUrl = isDev
    ? null
    : pathToFileURL(path.join(__dirname, '../renderer/index.html')).href;

  mainWindow.webContents.on('will-navigate', (event, url) => {
    let isAllowed: boolean;
    try {
      isAllowed = isDev
        ? new URL(url).origin === `http://localhost:${VITE_DEV_PORT}`
        : url === rendererFileUrl;
    } catch {
      isAllowed = false;
    }
    if (!isAllowed) {
      event.preventDefault();
      if (isExternalUrlAllowed(url)) {
        logger.info(`[security] Blocked navigation to external URL, opening in browser: ${url}`);
        shell.openExternal(url);
      } else {
        logger.warn(`[security] Blocked navigation to URL with disallowed protocol: ${url}`);
      }
    }
  });

  if (isDev) {
    logger.info('Running in development mode - loading from Vite dev server');
    mainWindow.webContents.openDevTools();

    // Load from Vite dev server
    mainWindow.loadURL(`http://localhost:${VITE_DEV_PORT}`).catch(err => {
      logger.error('Failed to load from Vite dev server:', err.message);
      logger.error('Make sure the web app is running: pnpm dev:web (in another terminal)');
    });
  } else {
    // Production: load from built files
    const indexPath = path.join(__dirname, '../renderer/index.html');
    logger.info('Running in production mode - loading from:', indexPath);

    mainWindow.loadFile(indexPath).catch(err => {
      logger.error('Failed to load renderer:', err);
    });
  }

  return mainWindow;
}

/**
 * Track webContents we've already instrumented so a single webContents
 * (e.g. if a window is reused) doesn't get double-wired listeners.
 */
const instrumentedWebContents = new WeakSet<WebContents>();

/**
 * Wire crash / health / load-failure diagnostics onto a BrowserWindow's
 * webContents. Idempotent per webContents instance — safe to call multiple
 * times from different window-creation paths.
 */
function attachWebContentsDiagnostics(webContents: WebContents): void {
  if (instrumentedWebContents.has(webContents)) return;
  instrumentedWebContents.add(webContents);

  webContents.on('render-process-gone', (_event, details) => {
    const isError = isHardCrashReason(details.reason);
    const payload = {
      reason: details.reason,
      exitCode: details.exitCode,
      url: safeGetUrl(webContents),
    };
    if (isError) {
      logger.error('[webContents render-process-gone]', payload);
    } else {
      logger.warn('[webContents render-process-gone]', payload);
    }
  });

  webContents.on('unresponsive', () => {
    logger.warn('[webContents unresponsive]', { url: safeGetUrl(webContents) });
  });

  webContents.on('responsive', () => {
    logger.info('[webContents responsive]', { url: safeGetUrl(webContents) });
  });

  webContents.on('preload-error', (_event, preloadPath, error) => {
    logger.error('[webContents preload-error]', {
      preloadPath,
      message: error.message,
      stack: error.stack,
    });
  });

  webContents.on(
    'did-fail-load',
    (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
      // errorCode -3 (ABORTED) fires when the user navigates away mid-load or
      // when we programmatically cancel — not a real failure.
      if (errorCode === -3) return;
      const payload = {
        errorCode,
        errorDescription,
        url: validatedURL,
        isMainFrame,
      };
      if (isMainFrame) {
        logger.error('[webContents did-fail-load]', payload);
      } else {
        logger.warn('[webContents did-fail-load]', payload);
      }
    }
  );
}

function safeGetUrl(webContents: WebContents): string {
  try {
    return webContents.getURL();
  } catch {
    return '<unavailable>';
  }
}
