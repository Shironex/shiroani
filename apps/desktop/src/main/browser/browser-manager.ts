import { session, webContents } from 'electron';
import { createMainLogger } from '../logging/logger';
import { getBlocker, enableCosmeticFiltering, disableCosmeticFiltering } from '../adblock';
import { fromElectronDetails } from '@ghostery/adblocker-electron';
import { buildChromeUserAgent, getOsSlug } from '../user-agent';

const logger = createMainLogger('BrowserManager');

/**
 * Normalize a hostname for whitelist comparisons (lowercase + strip leading `www.`).
 * Returns an empty string for invalid input.
 */
function normalizeHost(host: string | undefined | null): string {
  if (!host) return '';
  const lower = host.trim().toLowerCase();
  return lower.startsWith('www.') ? lower.slice(4) : lower;
}

/**
 * Manages the shared browser session for <webview> tags.
 *
 * Responsibilities:
 * - Initialize the `persist:browser` session (user agent, permissions)
 * - Register composite webRequest handlers (iframe unblocking + adblock)
 * - Toggle adblock on/off (network + cosmetic filtering)
 *
 * Tab lifecycle is entirely handled by the renderer process via <webview> DOM elements.
 */
export class BrowserManager {
  private browserSession: Electron.Session | null = null;
  private adblockEnabled = false;
  /** Top-frame hostnames where adblock network filtering is skipped. */
  private adblockWhitelist = new Set<string>();

  /**
   * Check if adblocking is currently enabled.
   */
  isAdblockEnabled(): boolean {
    return this.adblockEnabled;
  }

  /**
   * Replace the adblock whitelist with the given top-frame hostnames.
   * Hosts are normalized (lowercased, `www.` stripped) before storage.
   */
  setAdblockWhitelist(hosts: string[]): void {
    this.adblockWhitelist = new Set(hosts.map(h => normalizeHost(h)).filter(h => h.length > 0));
    logger.info(`Adblock whitelist updated: ${this.adblockWhitelist.size} host(s)`);
  }

  /**
   * Resolve the top-frame hostname for a webRequest by looking up the
   * originating webContents. Returns an empty string when unresolvable.
   */
  private resolveTopFrameHost(webContentsId: number | undefined): string {
    if (typeof webContentsId !== 'number' || webContentsId < 0) return '';
    try {
      const contents = webContents.fromId(webContentsId);
      if (!contents || contents.isDestroyed()) return '';
      const currentUrl = contents.getURL();
      if (!currentUrl) return '';
      return normalizeHost(new URL(currentUrl).hostname);
    } catch {
      return '';
    }
  }

  /**
   * Whether the top-frame for this request is an http/https page — i.e. the
   * in-app browser tab is showing a real web site, not a local/app page
   * (`file://`, `app://`, `shiroani-bg://`, `chrome://`, etc.).
   *
   * Used to scope iframe-unblocking: stripping `X-Frame-Options` and
   * `frame-ancestors` only makes sense when the top-frame is a streaming-style
   * site that wants to embed external video players. For any other top-frame
   * (including the app's own renderer) we leave upstream framing protections
   * intact, so a local/privileged page can't be silently framed by a subframe
   * response.
   */
  private isWebTopFrame(webContentsId: number | undefined): boolean {
    if (typeof webContentsId !== 'number' || webContentsId < 0) return false;
    try {
      const contents = webContents.fromId(webContentsId);
      if (!contents || contents.isDestroyed()) return false;
      const currentUrl = contents.getURL();
      if (!currentUrl) return false;
      const parsed = new URL(currentUrl);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * Whether the top-frame hostname for this request is whitelisted (adblock off).
   */
  private isTopFrameWhitelisted(webContentsId: number | undefined): boolean {
    if (this.adblockWhitelist.size === 0) return false;
    const host = this.resolveTopFrameHost(webContentsId);
    return host.length > 0 && this.adblockWhitelist.has(host);
  }

  /**
   * Get the browser session. Throws if not initialized.
   */
  getSession(): Electron.Session {
    if (!this.browserSession) {
      throw new Error('BrowserManager not initialized. Call init() after app.whenReady().');
    }
    return this.browserSession;
  }

  /**
   * Clear all persisted data for the built-in browser session: cookies, saved
   * logins, local/session/IndexedDB storage, and the HTTP cache. Backs the
   * "delete all data" factory reset. Safe to call before init() — it just
   * no-ops (there is nothing to clear yet).
   */
  async clearBrowsingData(): Promise<void> {
    if (!this.browserSession) {
      logger.warn('clearBrowsingData called before init — nothing to clear');
      return;
    }
    await this.browserSession.clearStorageData();
    await this.browserSession.clearCache();
    logger.info('Cleared built-in browser session data (storage + cache)');
  }

  /**
   * Initialize the browser session. Must be called after app.whenReady().
   */
  init(): void {
    // Create isolated session for browser tabs (separate from app session)
    this.browserSession = session.fromPartition('persist:browser');

    // Set platform-aware Chrome user agent to avoid Electron detection
    const osString = getOsSlug();
    this.browserSession.setUserAgent(buildChromeUserAgent());

    // Send Firefox UA for Google auth domains so sign-in isn't blocked.
    // Google detects embedded Chromium browsers via Client Hints + navigator.userAgentData
    // and rejects sign-in. Firefox doesn't support Client Hints at all, so using a
    // Firefox UA sidesteps all Chromium-specific detection (proven by qutebrowser, nativefier).
    // YouTube is excluded — it serves a worse player to Firefox.
    // Cloudflare Turnstile is intentionally NOT in this list: cleanly matching
    // Chrome (via session.setUserAgent + app.userAgentFallback) is more reliable
    // than pretending to be Firefox, because the JS-level navigator.userAgentData
    // still reports Chromium and the header/runtime mismatch is itself a red flag.
    const firefoxUA = `Mozilla/5.0 (${osString.replace('Intel Mac OS X 10_15_7', 'Intel Mac OS X 10.15; rv:137.0')}) Gecko/20100101 Firefox/137.0`;

    this.browserSession.webRequest.onBeforeSendHeaders(
      {
        urls: [
          '*://accounts.google.com/*',
          '*://*.accounts.google.com/*',
          '*://myaccount.google.com/*',
          '*://gds.google.com/*',
          '*://*.googleapis.com/*',
          '*://*.gstatic.com/*',
        ],
      },
      (details, callback) => {
        const headers = { ...details.requestHeaders };
        headers['User-Agent'] = firefoxUA;
        // Remove Chromium-only headers — Firefox never sends these
        delete headers['Sec-CH-UA'];
        delete headers['Sec-CH-UA-Mobile'];
        delete headers['Sec-CH-UA-Platform'];
        delete headers['Sec-CH-UA-Full-Version-List'];
        callback({ requestHeaders: headers });
      }
    );

    // Allow media and clipboard-write permissions for browser tabs (needed for
    // video players). `clipboard-read` is intentionally NOT granted here — any
    // visited site would otherwise be able to silently read the user's clipboard
    // without a gesture. Sanitized writes are fine (copy buttons, share links).
    const allowedPermissions = new Set([
      'clipboard-sanitized-write',
      'media',
      'mediaKeySystem',
      'fullscreen',
      'pointerLock',
    ]);

    // Permission request handler — allow known permissions, including from cross-origin subframes
    this.browserSession.setPermissionRequestHandler((_webContents, permission, callback) => {
      if (allowedPermissions.has(permission)) {
        callback(true);
        return;
      }
      logger.debug(`Browser session denied permission: ${permission}`);
      callback(false);
    });

    // Permission check handler — cross-origin subframes pass null webContents
    this.browserSession.setPermissionCheckHandler((_webContents, permission, _requestingOrigin) => {
      return allowedPermissions.has(permission);
    });

    // Register composite webRequest handlers
    this.registerCompositeWebRequestHandlers();

    logger.info('Browser session initialized');
  }

  /**
   * Enable adblocking on the browser session.
   */
  enableAdblock(): void {
    this.adblockEnabled = true;
    enableCosmeticFiltering(this.getSession());
    logger.info('Adblock enabled for browser session');
  }

  /**
   * Disable adblocking on the browser session.
   */
  disableAdblock(): void {
    this.adblockEnabled = false;
    disableCosmeticFiltering(this.getSession());
    logger.info('Adblock disabled for browser session');
  }

  /**
   * Register composite webRequest handlers on the browser session.
   * Always strips iframe-blocking headers and injects permissive Permissions-Policy.
   * When adblock is enabled, also runs adblocker network filtering.
   */
  private registerCompositeWebRequestHandlers(): void {
    const sess = this.getSession();

    // Composite onHeadersReceived: strip iframe restrictions + optional adblocker CSP
    sess.webRequest.onHeadersReceived({ urls: ['<all_urls>'] }, (details, callback) => {
      const responseHeaders = { ...details.responseHeaders } as Record<string, string[]>;

      // Only strip framing restrictions for subframe responses whose top-frame
      // is a real http/https web page. This scopes the iframe-unblocking to
      // streaming sites (the reason the override exists) and avoids weakening
      // clickjacking protection for local/app pages (`file://`, `app://`, etc.)
      // that could otherwise be silently framed by a subframe response.
      const scopeFramingOverride =
        details.resourceType === 'subFrame' && this.isWebTopFrame(details.webContentsId);

      if (scopeFramingOverride) {
        for (const key of Object.keys(responseHeaders)) {
          const lower = key.toLowerCase();
          if (lower === 'x-frame-options') {
            delete responseHeaders[key];
          } else if (lower === 'content-security-policy') {
            responseHeaders[key] = responseHeaders[key].map(policy =>
              policy
                .split(';')
                .filter(directive => !directive.trim().toLowerCase().startsWith('frame-ancestors'))
                .join(';')
            );
          }
        }
      }

      // Permissions-Policy override — fullscreen=* is required because the
      // HTTP-level Permissions-Policy header takes precedence over iframe
      // allow="fullscreen" attributes, so omitting it breaks cross-origin video
      // player embeds (YouTube, Crunchyroll players, etc.) that call
      // requestFullscreen(). The session permission handler's user-gesture gate
      // is the practical guard against abuse here.
      responseHeaders['Permissions-Policy'] = [
        'autoplay=*, fullscreen=*, encrypted-media=*, picture-in-picture=*',
      ];

      // If adblock is enabled, also run the adblocker's CSP injection logic.
      // TODO(adblock-whitelist): cosmetic filtering still applies session-wide;
      // see section L follow-up. This whitelist only disables network-level blocking.
      if (this.adblockEnabled && !this.isTopFrameWhitelisted(details.webContentsId)) {
        const blocker = getBlocker();
        if (
          blocker &&
          (details.resourceType === 'mainFrame' || details.resourceType === 'subFrame')
        ) {
          const request = fromElectronDetails(details);
          const rawCSP = blocker.getCSPDirectives(request);
          if (rawCSP !== undefined) {
            const CSP_HEADER_NAME = 'content-security-policy';
            const policies = rawCSP
              .split(';')
              .map(csp => csp.trim())
              .filter(Boolean);

            for (const hKey of Object.keys(responseHeaders)) {
              if (hKey.toLowerCase() === CSP_HEADER_NAME) {
                policies.push(...responseHeaders[hKey]);
                delete responseHeaders[hKey];
              }
            }

            responseHeaders[CSP_HEADER_NAME] = [policies.join('; ')];
          }
        }
      }

      callback({ responseHeaders });
    });

    // Composite onBeforeRequest: optional adblocker network blocking
    sess.webRequest.onBeforeRequest({ urls: ['<all_urls>'] }, (details, callback) => {
      if (!this.adblockEnabled) {
        callback({});
        return;
      }

      // TODO(adblock-whitelist): cosmetic filtering still applies session-wide;
      // see section L follow-up. This whitelist only disables network-level blocking.
      if (this.isTopFrameWhitelisted(details.webContentsId)) {
        callback({});
        return;
      }

      const blocker = getBlocker();
      if (!blocker) {
        callback({});
        return;
      }

      const request = fromElectronDetails(details);
      if (blocker.config.guessRequestTypeFromUrl === true && request.type === 'other') {
        request.guessTypeOfRequest();
      }

      // Never block main frame or subframe navigation (video player iframes)
      if (request.isMainFrame() || details.resourceType === 'subFrame') {
        callback({});
        return;
      }

      const { redirect, match } = blocker.match(request);
      if (redirect) {
        callback({ redirectURL: redirect.dataUrl });
      } else if (match) {
        callback({ cancel: true });
      } else {
        callback({});
      }
    });

    logger.info('Composite webRequest handlers registered');
  }
}
