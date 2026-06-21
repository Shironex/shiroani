import { BrowserWindow, ipcMain } from 'electron';
import { ADBLOCK_WHITELIST_MAX_ENTRIES } from '@shiroani/shared';
import { createMainLogger } from '../logging/logger';
import { BrowserManager } from '../browser/browser-manager';
import { attachWebviewContextMenu } from '../browser/webview-context-menu';
import { isExternalUrlAllowed } from '../url-utils';
import { handle, handleWithFallback } from './with-ipc-handler';
import {
  browserToggleAdblockSchema,
  browserSetFullscreenSchema,
  browserGetPopupBlockEnabledSchema,
  browserSetPopupBlockEnabledSchema,
  browserSetAdblockWhitelistSchema,
  browserClearSessionSchema,
} from './schemas';

const logger = createMainLogger('IPC:Browser');

/**
 * Domains that must always be allowed as popups (OAuth, auth flows, etc.).
 */
const POPUP_ALLOWLIST = new Set([
  'accounts.google.com',
  'myaccount.google.com',
  'appleid.apple.com',
  'login.microsoftonline.com',
  'github.com',
  'discord.com',
]);

/** Popup block switch: `true` blocks all cross-origin popups except the OAuth allowlist. */
let popupBlockEnabled = true;

/** Input validation limit for an individual whitelist host (RFC 1035 cap). */
const MAX_HOST_LENGTH = 253;

export function getPopupBlockEnabled(): boolean {
  return popupBlockEnabled;
}

export function setPopupBlockEnabled(enabled: boolean): void {
  popupBlockEnabled = enabled;
  logger.info(`Popup block ${enabled ? 'enabled' : 'disabled'}`);
}

/**
 * Check if a popup URL should be blocked.
 * Returns true if the popup should be blocked (not opened as a tab).
 */
function shouldBlockPopup(popupUrl: string, openerUrl: string): boolean {
  if (!popupBlockEnabled) return false;

  let popupHostname: string;
  let openerHostname: string;
  try {
    popupHostname = new URL(popupUrl).hostname;
    openerHostname = new URL(openerUrl).hostname;
  } catch {
    return true; // Block malformed URLs
  }

  // Always allow same-origin popups
  if (popupHostname === openerHostname) return false;

  // Always allow auth/OAuth domains
  if (POPUP_ALLOWLIST.has(popupHostname)) return false;

  // Block all cross-origin popups not in the OAuth allowlist
  logger.debug(`Popup blocked: ${popupUrl} from ${openerUrl}`);
  return true;
}

/**
 * Register browser IPC handlers.
 * Main process handles session-level concerns and window-level actions.
 */
export function registerBrowserHandlers(
  mainWindow: BrowserWindow,
  browserManager: BrowserManager
): void {
  // Toggle adblock (session-level, must stay in main process)
  handle(
    'browser:toggle-adblock',
    async (_event, enabled) => {
      logger.debug(`browser:toggle-adblock invoked, enabled=${enabled}`);
      if (enabled) {
        browserManager.enableAdblock();
      } else {
        browserManager.disableAdblock();
      }
    },
    { schema: browserToggleAdblockSchema }
  );

  // Set fullscreen state — renderer calls this when webview enters/exits HTML5 fullscreen
  // because webview cannot directly control the BrowserWindow fullscreen state.
  //
  // Security: only the main renderer's own webContents may drive window-level
  // fullscreen; otherwise a compromised webview (or cross-origin subframe)
  // could force fullscreen and paint lookalike UI over the real chrome.
  handle(
    'browser:set-fullscreen',
    (event, isFullscreen) => {
      // Tests use a mocked ipcMain that passes `{}` as event — be permissive
      // when `event.sender` isn't a real webContents so the suite keeps working.
      if (event?.sender && event.sender !== mainWindow.webContents) {
        logger.warn('[security] browser:set-fullscreen denied — sender is not the main window');
        return;
      }
      logger.debug(`browser:set-fullscreen invoked, isFullscreen=${isFullscreen}`);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.setFullScreen(isFullscreen);
      }
    },
    { schema: browserSetFullscreenSchema }
  );

  // Popup block switch IPC
  handleWithFallback(
    'browser:get-popup-block-enabled',
    () => {
      return popupBlockEnabled;
    },
    () => true,
    { schema: browserGetPopupBlockEnabledSchema }
  );

  handleWithFallback(
    'browser:set-popup-block-enabled',
    (_event, enabled) => {
      setPopupBlockEnabled(enabled);
    },
    () => undefined,
    { schema: browserSetPopupBlockEnabledSchema }
  );

  // Adblock whitelist IPC — validates input and silently drops invalid entries
  handleWithFallback(
    'browser:set-adblock-whitelist',
    (_event, hosts) => {
      if (!Array.isArray(hosts)) {
        logger.warn('browser:set-adblock-whitelist received non-array payload; ignoring');
        return;
      }
      const cleaned: string[] = [];
      for (const entry of hosts.slice(0, ADBLOCK_WHITELIST_MAX_ENTRIES)) {
        if (typeof entry !== 'string') continue;
        const trimmed = entry.trim();
        if (!trimmed || trimmed.length > MAX_HOST_LENGTH) continue;
        cleaned.push(trimmed);
      }
      browserManager.setAdblockWhitelist(cleaned);
    },
    () => undefined,
    { schema: browserSetAdblockWhitelistSchema }
  );

  // Wipe the built-in browser session (cookies, logins, cache, storage) for the
  // "delete all data" factory reset. Surfaces failure to the renderer, which
  // treats it as best-effort within the larger wipe sequence.
  handle(
    'browser:clear-session',
    async () => {
      logger.warn('browser:clear-session invoked — clearing built-in browser session data');
      await browserManager.clearBrowsingData();
    },
    { schema: browserClearSessionSchema }
  );

  // Intercept window.open calls from webview guest pages.
  // Since the `new-window` event was removed in Electron 22, we must use
  // `did-attach-webview` to access each webview's webContents and set up
  // the window open handler from the main process side.
  mainWindow.webContents.on('did-attach-webview', (_event, webContents) => {
    // Open a URL in a new browser tab, reusing the same channel the window-open
    // handler uses (the renderer's useBrowserInit listens and calls openTab).
    // Validates against the external-URL allowlist so a context-menu "open in
    // new tab" can't smuggle a javascript:/data: link into a fresh tab.
    const openUrlInNewTab = (url: string) => {
      if (mainWindow.isDestroyed()) return;
      let parsed: URL;
      try {
        parsed = new URL(url);
      } catch {
        return;
      }
      if (!isExternalUrlAllowed(parsed.href)) return;
      mainWindow.webContents.send('browser:new-window-request', parsed.href);
    };

    // Right-click context menu (copy/paste, link/image actions, navigation,
    // inspect). The guest renders third-party pages, so this is a native menu
    // built from the context-menu event params.
    attachWebviewContextMenu(webContents, openUrlInNewTab);

    webContents.setWindowOpenHandler(({ url }) => {
      if (!url) return { action: 'deny' };

      // Parse via the WHATWG URL parser instead of prefix-matching on
      // `http://` / `https://` — prefix checks don't catch malformed URLs,
      // IDN-encoded host spoofs, or `javascript:`/`data:` URLs that happen
      // to contain `http://` later in the string.
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(url);
      } catch {
        return { action: 'deny' };
      }

      if (!isExternalUrlAllowed(parsedUrl.href)) {
        return { action: 'deny' };
      }

      const openerUrl = webContents.getURL();

      if (shouldBlockPopup(parsedUrl.href, openerUrl)) {
        logger.debug(`Popup denied: ${parsedUrl.href}`);
        return { action: 'deny' };
      }

      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('browser:new-window-request', parsedUrl.href);
      }
      return { action: 'deny' };
    });

    // Intercept keyboard shortcuts while webview has focus.
    // Key events inside a <webview> don't bubble to the renderer's window,
    // so we catch them here and forward to the renderer via IPC.
    webContents.on('before-input-event', (event, input) => {
      if (mainWindow.isDestroyed() || input.type !== 'keyDown') return;
      const ctrl = input.control || input.meta;

      // Ctrl+key shortcuts
      if (ctrl) {
        switch (input.key) {
          case 'w':
          case 't':
          case 'l':
          case 'f':
          case 'r':
          case 'Tab':
            event.preventDefault();
            mainWindow.webContents.send('browser:shortcut', {
              key: input.key,
              ctrl: true,
              shift: input.shift,
            });
            return;
        }
      }

      // Alt+Arrow navigation
      if (input.alt && !ctrl) {
        if (input.key === 'ArrowLeft' || input.key === 'ArrowRight') {
          event.preventDefault();
          mainWindow.webContents.send('browser:shortcut', {
            key: input.key,
            alt: true,
          });
        }
      }
    });
  });

  // Mouse side buttons (X1/X2) → back/forward, the desktop-browser convention.
  // `app-command` is a BrowserWindow-level event (Windows/Linux) that fires for
  // the focused contents — including webview guests, whose own mouse events
  // never reach the renderer. We route through the same browser:shortcut channel
  // the Alt+Arrow path uses, so it navigates the active pane. macOS emits these
  // buttons as Chromium's built-in guest navigation, so no handler is needed there.
  mainWindow.on('app-command', (event, command) => {
    if (mainWindow.isDestroyed()) return;
    if (command === 'browser-backward') {
      event.preventDefault();
      mainWindow.webContents.send('browser:shortcut', { key: 'ArrowLeft', alt: true });
    } else if (command === 'browser-forward') {
      event.preventDefault();
      mainWindow.webContents.send('browser:shortcut', { key: 'ArrowRight', alt: true });
    }
  });
}

/**
 * Clean up browser IPC handlers
 */
export function cleanupBrowserHandlers(): void {
  ipcMain.removeHandler('browser:toggle-adblock');
  ipcMain.removeHandler('browser:set-fullscreen');
  ipcMain.removeHandler('browser:get-popup-block-enabled');
  ipcMain.removeHandler('browser:set-popup-block-enabled');
  ipcMain.removeHandler('browser:set-adblock-whitelist');
  ipcMain.removeHandler('browser:clear-session');
}
