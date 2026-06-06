/**
 * MyAnimeList (MAL) API v2 OAuth constants shared across surfaces.
 *
 * Grant model (locked): Authorization Code + PKCE. MAL supports ONLY
 * `code_challenge_method=plain` (S256 is unsupported), so the `code_challenge`
 * sent to the authorize endpoint is the `code_verifier` VERBATIM. The user is
 * sent to {@link MAL_OAUTH_AUTHORIZE_URL} with `response_type=code`; MAL returns
 * the authorization code in the URL QUERY (`?code=...&state=...`) of the
 * redirect URI — NOT the fragment (this is where it differs from AniList's
 * implicit grant). The main process then exchanges the code for tokens at
 * {@link MAL_OAUTH_TOKEN_URL}.
 *
 * `client_id` is PUBLIC and maintainer-supplied at runtime via
 *   - main: `process.env.MAL_CLIENT_ID`
 * falling back to {@link DEFAULT_MAL_CLIENT_ID} ('' = not configured).
 * `client_secret` (if the registered client has one) is read main-side ONLY
 * from `process.env.MAL_CLIENT_SECRET` and never leaves the main process — the
 * PKCE flow works for public clients without it, so it is OPTIONAL.
 */

/** Base authorize endpoint. Use {@link buildMalAuthorizeUrl} to add params. */
export const MAL_OAUTH_AUTHORIZE_URL = 'https://myanimelist.net/v1/oauth2/authorize';

/** Token exchange + refresh endpoint (POST, application/x-www-form-urlencoded). */
export const MAL_OAUTH_TOKEN_URL = 'https://myanimelist.net/v1/oauth2/token';

/**
 * Redirect URI registered for the MAL client. The main process intercepts
 * navigation to this URL and reads the authorization code from the QUERY — the
 * loopback page itself is never actually served.
 */
export const MAL_OAUTH_REDIRECT_URI = 'http://localhost:53682/callback';

/** Base URL for all MAL API v2 data requests. */
export const MAL_API_BASE = 'https://api.myanimelist.net/v2';

/**
 * Shared empty fallback for an unconfigured client id. The main process imports
 * THIS constant so "not configured" is detected identically everywhere.
 */
export const DEFAULT_MAL_CLIENT_ID = '';

/**
 * Build the MAL Authorization-Code-with-PKCE authorize URL.
 *
 * Emits `response_type=code`, the public `client_id`, the PKCE
 * `code_challenge` with `code_challenge_method=plain` (MAL supports plain
 * ONLY), the CSRF `state`, and the explicit `redirect_uri`. Because MAL uses
 * the `plain` method, `codeChallenge` is the `code_verifier` verbatim.
 */
export function buildMalAuthorizeUrl(
  clientId: string,
  codeChallenge: string,
  state: string
): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    code_challenge: codeChallenge,
    code_challenge_method: 'plain',
    state,
    redirect_uri: MAL_OAUTH_REDIRECT_URI,
  });
  return `${MAL_OAUTH_AUTHORIZE_URL}?${params.toString()}`;
}
