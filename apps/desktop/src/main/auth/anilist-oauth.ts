import { BrowserWindow, session } from 'electron';
import {
  ANILIST_OAUTH_REDIRECT_URI,
  buildAniListAuthorizeUrl,
  createLogger,
} from '@shiroani/shared';

const logger = createLogger('AniListOAuth');

/**
 * Isolated, NON-persistent session partition for the OAuth popup.
 *
 * No `persist:` prefix → cookies / storage never touch disk and never mix with
 * the app's browsing sessions. Because the in-memory session does persist for
 * the process lifetime, it is also explicitly cleared at the start of each auth
 * attempt (see `startAniListOAuth`). `cache: false` further avoids caching the
 * authorize page.
 */
const OAUTH_PARTITION = 'anilist-oauth';

/** Hard cap on how long the popup may stay open before we give up. */
const OAUTH_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * Fallback token lifetime when AniList omits/garbles `expires_in`.
 * AniList implicit-grant access tokens are documented to last ~1 year, so we
 * default to that rather than persisting a 0-TTL (dead-on-arrival) session.
 */
const DEFAULT_TOKEN_TTL_SECONDS = 365 * 24 * 60 * 60;

export interface ParsedTokenFragment {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
}

/**
 * Parse the AniList implicit-grant redirect URL fragment.
 *
 * Expects `<redirect>#access_token=...&token_type=Bearer&expires_in=...`.
 * Returns `null` when the fragment is absent, the access token is missing, or
 * the value cannot be parsed. PURE — no Electron, no logging of the secret.
 *
 * Security: this function NEVER logs its input (the URL fragment IS the token).
 */
export function parseTokenFragment(url: string): ParsedTokenFragment | null {
  if (typeof url !== 'string') {
    return null;
  }

  const hashIndex = url.indexOf('#');
  if (hashIndex === -1) {
    return null;
  }

  const fragment = url.slice(hashIndex + 1);
  if (!fragment) {
    return null;
  }

  const params = new URLSearchParams(fragment);
  const accessToken = params.get('access_token');
  if (!accessToken) {
    return null;
  }

  const tokenType = params.get('token_type') ?? 'Bearer';
  const expiresInRaw = params.get('expires_in');
  const expiresIn = expiresInRaw != null ? Number(expiresInRaw) : NaN;

  return {
    accessToken,
    tokenType,
    // AniList implicit grant tokens last ~1 year; if absent/invalid, fall back
    // to the documented default lifetime rather than 0 (which would persist a
    // session that's already expired on arrival) or a bogus far-future value.
    expiresIn: Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : DEFAULT_TOKEN_TTL_SECONDS,
  };
}

/**
 * Open a modal popup window to the AniList authorize endpoint and resolve with
 * the access token once AniList redirects to the configured redirect URI.
 *
 * Security hardening (reviewed):
 * - Isolated, non-persistent session partition (cookies die with the window).
 * - `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`.
 * - Navigation to the redirect URI is intercepted on BOTH `will-redirect` and
 *   `will-navigate`, `preventDefault()`-ed, and the token read from the
 *   fragment — the redirect page itself is never loaded.
 * - Rejects on the user closing the window without a token, and on timeout.
 * - The token / URL is NEVER logged.
 */
export async function startAniListOAuth(
  clientId: string
): Promise<{ accessToken: string; expiresIn: number }> {
  const oauthSession = session.fromPartition(OAUTH_PARTITION, { cache: false });

  // A non-persistent partition is in-memory but the SAME Session instance is
  // returned for the life of the process, and closing the popup does not destroy
  // it — so AniList login cookies from a cancelled/failed attempt would linger
  // and skip the account picker on a retry/account switch. Clear before each
  // attempt, and AWAIT it so the wipe completes before the OAuth navigation
  // begins (a fire-and-forget clear would race loadURL).
  await oauthSession.clearStorageData();

  return new Promise((resolve, reject) => {
    const popup = new BrowserWindow({
      width: 500,
      height: 720,
      modal: true,
      show: true,
      autoHideMenuBar: true,
      title: 'AniList',
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        session: oauthSession,
      },
    });

    // Keep the entire flow inside this one intercepted webContents: a child
    // window spawned via window.open() would inherit the OAuth session yet sit
    // outside our navigation interception, so a token-bearing redirect could
    // land in a document we never inspect.
    popup.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

    let settled = false;

    const cleanup = (): void => {
      clearTimeout(timeout);
      if (!popup.isDestroyed()) {
        popup.removeAllListeners('closed');
        popup.close();
      }
    };

    const finish = (token: ParsedTokenFragment): void => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve({ accessToken: token.accessToken, expiresIn: token.expiresIn });
    };

    const fail = (reason: string): void => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error(reason));
    };

    const timeout = setTimeout(() => {
      fail('AniList authorization timed out');
    }, OAUTH_TIMEOUT_MS);

    const redirectTarget = new URL(ANILIST_OAUTH_REDIRECT_URI);

    /** Allow only AniList's own origins to load inside the popup. */
    const isAllowedOrigin = (host: string): boolean =>
      host === 'anilist.co' || host.endsWith('.anilist.co');

    // Both events must be intercepted: AniList may arrive at the redirect URI
    // via an HTTP redirect (`will-redirect`) or an in-page navigation
    // (`will-navigate`). We prevent the redirect page from ever loading, and
    // confine all other navigation to AniList origins so the popup can't be
    // steered to an arbitrary site while holding the OAuth session.
    const handleNavigation = (event: Electron.Event, navUrl: string): void => {
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(navUrl);
      } catch {
        event.preventDefault();
        return;
      }

      // Canonical match (origin + pathname) — never a prefix test, which would
      // accept e.g. `/oauth/anilistX` or userinfo/suffix tricks as the redirect.
      if (
        parsedUrl.origin === redirectTarget.origin &&
        parsedUrl.pathname === redirectTarget.pathname
      ) {
        event.preventDefault();
        const parsed = parseTokenFragment(navUrl);
        if (parsed) {
          finish(parsed);
        } else {
          fail('AniList redirect did not contain an access token');
        }
        return;
      }

      // Anything that isn't an AniList origin is blocked outright.
      if (!isAllowedOrigin(parsedUrl.hostname)) {
        event.preventDefault();
      }
    };

    popup.webContents.on('will-redirect', handleNavigation);
    popup.webContents.on('will-navigate', handleNavigation);

    popup.on('closed', () => {
      fail('AniList authorization window was closed');
    });

    logger.info('Opening AniList authorization window');
    // Note: the authorize URL contains only the public client_id — safe to load.
    void popup.loadURL(buildAniListAuthorizeUrl(clientId)).catch(err => {
      fail(`Failed to open AniList authorization page: ${err?.message ?? 'unknown error'}`);
    });
  });
}
