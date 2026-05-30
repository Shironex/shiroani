/**
 * AniList OAuth (implicit grant) constants shared across surfaces.
 *
 * Grant model (locked): implicit grant. The user is sent to the authorize URL
 * with `response_type=token`; AniList returns the access token in the URL
 * FRAGMENT of the redirect URI (`#access_token=...&token_type=Bearer&
 * expires_in=...`). There is no client secret and no refresh token.
 *
 * `client_id` is PUBLIC and maintainer-supplied at build/runtime via
 *   - web:  `import.meta.env.VITE_ANILIST_CLIENT_ID`
 *   - main: `process.env.ANILIST_CLIENT_ID`
 * Both fall back to {@link DEFAULT_ANILIST_CLIENT_ID} ('' = not configured).
 */

/** Base authorize endpoint. Use {@link buildAniListAuthorizeUrl} to add params. */
export const ANILIST_OAUTH_AUTHORIZE_URL = 'https://anilist.co/api/v2/oauth/authorize';

/**
 * Redirect URI registered for the AniList client. With implicit grant the main
 * process intercepts navigation to this URL and reads the token from the
 * fragment — the page itself is never actually loaded.
 */
export const ANILIST_OAUTH_REDIRECT_URI = 'https://shiroani.app/oauth/anilist';

/**
 * Shared empty fallback for an unconfigured client id. Both web and main import
 * THIS constant so "not configured" is detected identically everywhere.
 */
export const DEFAULT_ANILIST_CLIENT_ID = '';

/**
 * Build the AniList implicit-grant authorize URL.
 *
 * Emits exactly `?client_id={id}&response_type=token` per the locked spec — the
 * redirect URI is the one configured on the AniList client, so it is NOT
 * appended here.
 */
export function buildAniListAuthorizeUrl(clientId: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'token',
  });
  return `${ANILIST_OAUTH_AUTHORIZE_URL}?${params.toString()}`;
}
