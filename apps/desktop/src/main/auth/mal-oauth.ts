import { randomBytes } from 'node:crypto';
import { BrowserWindow, session } from 'electron';
import { MAL_OAUTH_REDIRECT_URI, buildMalAuthorizeUrl, createLogger } from '@shiroani/shared';
import { exchangeMalCodeForToken, type MalTokenResponse } from './mal-token-request';

const logger = createLogger('MalOAuth');

/**
 * Isolated, NON-persistent session partition for the OAuth popup.
 *
 * No `persist:` prefix → cookies / storage never touch disk and never mix with
 * the app's browsing sessions. Because the in-memory session does persist for
 * the process lifetime, it is also explicitly cleared at the start of each auth
 * attempt (see `startMalOAuth`). `cache: false` further avoids caching the
 * authorize page. Mirrors the AniList OAuth partition.
 */
const OAUTH_PARTITION = 'mal-oauth';

/** Hard cap on how long the popup may stay open before we give up. */
const OAUTH_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * PKCE `code_verifier` length. MAL accepts 43–128 chars from the unreserved
 * charset; 96 random bytes base64url-encoded yields 128 chars — the high end of
 * the allowed range for maximum entropy. MAL supports `plain` ONLY, so this
 * value is ALSO the `code_challenge` sent to the authorize endpoint.
 */
const CODE_VERIFIER_BYTES = 96;

/** Bytes of entropy for the CSRF `state` parameter. */
const STATE_BYTES = 32;

export interface ParsedAuthCode {
  code: string;
  state: string;
}

/**
 * Base64url encoding (RFC 4648 §5) of random bytes — the unreserved charset
 * (`A-Za-z0-9-_`) PKCE requires, with no padding.
 */
function base64url(bytes: Buffer): string {
  return bytes.toString('base64url');
}

/**
 * Extract the authorization `code` + `state` from the redirect URL QUERY.
 *
 * MAL's authorization-code grant carries `?code=...&state=...` in the QUERY (not
 * the fragment — this is where it differs from AniList's implicit grant).
 * Returns `null` when the input is not a string, is unparseable, or lacks
 * either parameter. PURE — never logs its input (the code is a secret).
 */
export function parseAuthCode(url: string): ParsedAuthCode | null {
  if (typeof url !== 'string') {
    return null;
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const code = parsed.searchParams.get('code');
  const state = parsed.searchParams.get('state');
  if (!code || !state) {
    return null;
  }
  return { code, state };
}

/**
 * Open a modal popup window to the MAL authorize endpoint and resolve with the
 * access + refresh tokens once MAL redirects to the configured redirect URI.
 *
 * Security hardening (mirrors AniList, adapted for the authorization-code grant):
 * - Isolated, non-persistent session partition (cookies die with the window).
 * - `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`.
 * - PKCE `code_verifier` + CSRF `state` are generated here with `crypto` and
 *   never leave the main process; `state` is validated on the return.
 * - Navigation to the redirect URI is intercepted on BOTH `will-redirect` and
 *   `will-navigate`, `preventDefault()`-ed, and the code read from the QUERY —
 *   the loopback redirect page (which is never served) is never loaded.
 * - The auth code, the token exchange request/response, and the verifier are
 *   NEVER logged.
 * - Rejects on the user closing the window without a code, on timeout, and on a
 *   forwarded MAL `?error=` redirect.
 */
export async function startMalOAuth(
  clientId: string,
  clientSecret?: string
): Promise<MalTokenResponse> {
  // PKCE: MAL supports `plain` ONLY, so the code_challenge IS the code_verifier.
  const codeVerifier = base64url(randomBytes(CODE_VERIFIER_BYTES));
  const state = base64url(randomBytes(STATE_BYTES));

  const oauthSession = session.fromPartition(OAUTH_PARTITION, { cache: false });

  // A non-persistent partition is in-memory but the SAME Session instance is
  // returned for the life of the process, and closing the popup does not destroy
  // it — so MAL login cookies from a cancelled/failed attempt would linger and
  // skip the account picker on a retry/account switch. Clear before each attempt,
  // and AWAIT it so the wipe completes before the OAuth navigation begins (a
  // fire-and-forget clear would race loadURL).
  await oauthSession.clearStorageData();

  return new Promise((resolve, reject) => {
    const popup = new BrowserWindow({
      width: 500,
      height: 720,
      modal: true,
      show: true,
      autoHideMenuBar: true,
      title: 'MyAnimeList',
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        session: oauthSession,
      },
    });

    // Keep the entire flow inside this one intercepted webContents: a child
    // window spawned via window.open() would inherit the OAuth session yet sit
    // outside our navigation interception, so a code-bearing redirect could land
    // in a document we never inspect.
    popup.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

    let settled = false;

    const cleanup = (): void => {
      clearTimeout(timeout);
      if (!popup.isDestroyed()) {
        popup.removeAllListeners('closed');
        popup.close();
      }
    };

    const finish = (tokens: MalTokenResponse): void => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(tokens);
    };

    const fail = (reason: string): void => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error(reason));
    };

    const timeout = setTimeout(() => {
      fail('MAL authorization timed out');
    }, OAUTH_TIMEOUT_MS);

    const redirectTarget = new URL(MAL_OAUTH_REDIRECT_URI);

    /** Allow only MAL's own origins to load inside the popup. */
    const isAllowedOrigin = (host: string): boolean =>
      host === 'myanimelist.net' || host.endsWith('.myanimelist.net');

    // Both events must be intercepted: MAL may arrive at the redirect URI via an
    // HTTP redirect (`will-redirect`) or an in-page navigation (`will-navigate`).
    // We prevent the loopback redirect page from ever loading, and confine all
    // other navigation to MAL origins so the popup can't be steered to an
    // arbitrary site while holding the OAuth session.
    const handleNavigation = (event: Electron.Event, navUrl: string): void => {
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(navUrl);
      } catch {
        event.preventDefault();
        return;
      }

      // Canonical match (origin + pathname) — never a prefix test, which would
      // accept e.g. `/callbackX` or suffix tricks as the redirect. This MUST be
      // checked BEFORE the origin allowlist below, since the loopback redirect
      // target is not a MAL origin and would otherwise be blocked.
      if (
        parsedUrl.origin === redirectTarget.origin &&
        parsedUrl.pathname === redirectTarget.pathname
      ) {
        event.preventDefault();

        // A denied/failed authorization redirects with the error in the QUERY
        // (e.g. `?error=access_denied&error_description=...`). Forward it so the
        // user sees an actionable reason rather than a generic "no code".
        const error = parsedUrl.searchParams.get('error');
        if (error) {
          const errorDesc = parsedUrl.searchParams.get('error_description');
          fail(`MAL authorization failed: ${errorDesc || error}`);
          return;
        }

        const parsed = parseAuthCode(navUrl);
        if (!parsed) {
          fail('MAL redirect did not contain an authorization code');
          return;
        }
        // CSRF: the returned state MUST match the one we generated, or this is a
        // forged/replayed redirect — reject without exchanging the code.
        if (parsed.state !== state) {
          fail('MAL authorization state mismatch (possible CSRF)');
          return;
        }

        // Exchange the code main-side. The popup is already done; any failure
        // here surfaces to the connect handler. Errors never include the code.
        exchangeMalCodeForToken({
          clientId,
          clientSecret,
          code: parsed.code,
          codeVerifier,
        })
          .then(finish)
          .catch((err: unknown) =>
            fail(
              `MAL token exchange failed: ${err instanceof Error ? err.message : 'unknown error'}`
            )
          );
        return;
      }

      // Anything that isn't a MAL origin is blocked outright.
      if (!isAllowedOrigin(parsedUrl.hostname)) {
        event.preventDefault();
      }
    };

    popup.webContents.on('will-redirect', handleNavigation);
    popup.webContents.on('will-navigate', handleNavigation);

    popup.on('closed', () => {
      fail('MAL authorization window was closed');
    });

    logger.info('Opening MAL authorization window');
    // The authorize URL embeds the PKCE `code_challenge`, which UNDER PLAIN
    // METHOD equals the `code_verifier` — a secret. Electron's loadURL rejection
    // can carry the full target URL in its message, so we deliberately do NOT
    // interpolate `err.message` (or any error detail) into the failure reason;
    // doing so would propagate the verifier into the IPC error log. Use the
    // error CODE only when present (e.g. ERR_CONNECTION_REFUSED) — it never
    // contains the URL.
    void popup
      .loadURL(buildMalAuthorizeUrl(clientId, codeVerifier, state))
      .catch((err: unknown) => {
        const code =
          err && typeof err === 'object' && 'code' in err && typeof err.code === 'string'
            ? err.code
            : null;
        fail(`Failed to open MAL authorization page${code ? ` (${code})` : ''}`);
      });
  });
}
