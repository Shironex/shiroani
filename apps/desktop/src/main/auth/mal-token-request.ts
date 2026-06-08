import { MAL_OAUTH_REDIRECT_URI, MAL_OAUTH_TOKEN_URL } from '@shiroani/shared';

/**
 * Standalone MAL token-endpoint POSTs (exchange + refresh).
 *
 * Both grants hit the SAME endpoint ({@link MAL_OAUTH_TOKEN_URL}) with the same
 * `application/x-www-form-urlencoded` content type, so they are co-located here
 * to DRY the request/response handling and to keep them unit-testable WITHOUT a
 * `BrowserWindow` (the OAuth popup) — the popup only produces the auth code; the
 * exchange and every refresh run through these pure functions.
 *
 * Security: these functions NEVER log their inputs or outputs. The `code`,
 * `code_verifier`, and every token are secrets.
 */

/** Shape every MAL token grant resolves to (exchange and refresh alike). */
export interface MalTokenResponse {
  accessToken: string;
  refreshToken: string;
  /** Token lifetime in seconds, as reported by MAL at runtime (do NOT hardcode). */
  expiresIn: number;
}

/**
 * Parse + validate a raw MAL token endpoint JSON body into {@link MalTokenResponse}.
 *
 * MAL returns `{ token_type, expires_in, access_token, refresh_token }`. Throws
 * when the access/refresh token is missing — a token grant with no token is a
 * hard failure, not a degraded success. `expires_in` is read at runtime (docs
 * self-contradict 1h vs ~28d) and only accepted when it is a finite positive
 * number; an absent/garbled value throws rather than persisting a 0-TTL
 * (dead-on-arrival) session.
 */
export function parseMalTokenResponse(raw: unknown): MalTokenResponse {
  if (!raw || typeof raw !== 'object') {
    throw new Error('MAL token endpoint returned a non-object body');
  }
  const body = raw as Record<string, unknown>;
  const accessToken = body.access_token;
  const refreshToken = body.refresh_token;
  const expiresInRaw = body.expires_in;

  if (typeof accessToken !== 'string' || !accessToken) {
    throw new Error('MAL token endpoint response is missing access_token');
  }
  if (typeof refreshToken !== 'string' || !refreshToken) {
    throw new Error('MAL token endpoint response is missing refresh_token');
  }
  const expiresIn = typeof expiresInRaw === 'number' ? expiresInRaw : Number(expiresInRaw);
  if (!Number.isFinite(expiresIn) || expiresIn <= 0) {
    throw new Error('MAL token endpoint response has an invalid expires_in');
  }

  return { accessToken, refreshToken, expiresIn };
}

/**
 * POST the token endpoint with a form-encoded body and parse the JSON result.
 *
 * Shared by both the authorization-code exchange and the refresh grant. On a
 * non-2xx response it throws with the status only — the body may echo the
 * submitted code/verifier, so it is deliberately NOT included in the error.
 */
async function postToken(params: URLSearchParams): Promise<MalTokenResponse> {
  const response = await fetch(MAL_OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!response.ok) {
    // Never include the response body — MAL may echo the submitted code/verifier.
    throw new Error(`MAL token request failed with status ${response.status}`);
  }

  const json: unknown = await response.json();
  return parseMalTokenResponse(json);
}

/**
 * Exchange an authorization code for an access + refresh token pair.
 *
 * PKCE: `code_verifier` is sent VERBATIM (MAL's `plain` method means the
 * authorize-time `code_challenge` equalled this value). ShiroAni's MAL client is
 * registered as a PUBLIC ("other") app type, so no `client_secret` is sent — the
 * PKCE proof is what authenticates the exchange.
 */
export async function exchangeMalCodeForToken(args: {
  clientId: string;
  code: string;
  codeVerifier: string;
}): Promise<MalTokenResponse> {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: args.clientId,
    code: args.code,
    code_verifier: args.codeVerifier,
    redirect_uri: MAL_OAUTH_REDIRECT_URI,
  });
  return postToken(params);
}

/**
 * Refresh an access token using a refresh token. MAL ROTATES the refresh token
 * on every refresh, so the caller MUST persist BOTH tokens from the result and
 * discard the old refresh token. No `client_secret` — public ("other") client.
 */
export async function refreshMalToken(args: {
  clientId: string;
  refreshToken: string;
}): Promise<MalTokenResponse> {
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: args.clientId,
    refresh_token: args.refreshToken,
  });
  return postToken(params);
}
