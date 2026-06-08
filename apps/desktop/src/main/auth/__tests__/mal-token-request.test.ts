jest.mock('electron');

import {
  exchangeMalCodeForToken,
  refreshMalToken,
  parseMalTokenResponse,
} from '../mal-token-request';

const TOKEN_URL = 'https://myanimelist.net/v1/oauth2/token';

/** Build a Response-like stub for the global fetch mock. */
function okJson(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  } as unknown as Response;
}

function errResponse(status: number, body: unknown = { error: 'invalid_request' }): Response {
  return {
    ok: false,
    status,
    json: async () => body,
  } as unknown as Response;
}

/** Decode the form-encoded body passed to fetch into a flat record. */
function decodeBody(call: unknown[]): Record<string, string> {
  const init = call[1] as RequestInit;
  return Object.fromEntries(new URLSearchParams(init.body as string));
}

describe('mal-token-request', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  const tokenBody = {
    token_type: 'Bearer',
    expires_in: 2_592_000,
    access_token: 'access-abc',
    refresh_token: 'refresh-def',
  };

  describe('parseMalTokenResponse', () => {
    it('reads expires_in at runtime (not hardcoded)', () => {
      expect(parseMalTokenResponse({ ...tokenBody, expires_in: 3600 })).toEqual({
        accessToken: 'access-abc',
        refreshToken: 'refresh-def',
        expiresIn: 3600,
      });
    });

    it('throws when access_token is missing', () => {
      expect(() => parseMalTokenResponse({ ...tokenBody, access_token: undefined })).toThrow(
        /access_token/
      );
    });

    it('throws when refresh_token is missing', () => {
      expect(() => parseMalTokenResponse({ ...tokenBody, refresh_token: undefined })).toThrow(
        /refresh_token/
      );
    });

    it('throws on a missing/invalid expires_in rather than persisting a 0-TTL', () => {
      expect(() => parseMalTokenResponse({ ...tokenBody, expires_in: undefined })).toThrow(
        /expires_in/
      );
      expect(() => parseMalTokenResponse({ ...tokenBody, expires_in: 0 })).toThrow(/expires_in/);
    });
  });

  describe('exchangeMalCodeForToken', () => {
    it('POSTs the form-encoded authorization_code grant to the token endpoint', async () => {
      fetchMock.mockResolvedValue(okJson(tokenBody));

      const result = await exchangeMalCodeForToken({
        clientId: 'client-1',
        code: 'the-code',
        codeVerifier: 'the-verifier',
      });

      expect(result).toEqual({
        accessToken: 'access-abc',
        refreshToken: 'refresh-def',
        expiresIn: 2_592_000,
      });

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(TOKEN_URL);
      expect(init.method).toBe('POST');
      expect((init.headers as Record<string, string>)['Content-Type']).toBe(
        'application/x-www-form-urlencoded'
      );

      const body = decodeBody(fetchMock.mock.calls[0]);
      expect(body).toMatchObject({
        grant_type: 'authorization_code',
        client_id: 'client-1',
        code: 'the-code',
        // PKCE plain: code_verifier sent verbatim.
        code_verifier: 'the-verifier',
        redirect_uri: 'http://localhost:53682/callback',
      });
    });

    it('never sends a client_secret (public PKCE "other" client)', async () => {
      fetchMock.mockResolvedValue(okJson(tokenBody));
      await exchangeMalCodeForToken({
        clientId: 'client-1',
        code: 'c',
        codeVerifier: 'v',
      });
      const body = decodeBody(fetchMock.mock.calls[0]);
      expect(body).not.toHaveProperty('client_secret');
    });

    it('throws with status only on a non-2xx (never echoes the code/verifier)', async () => {
      fetchMock.mockResolvedValue(
        errResponse(400, {
          error: 'invalid_grant',
          // A hostile/echoing endpoint reflecting the submitted values back.
          code: 'the-code',
          code_verifier: 'the-verifier',
        })
      );
      const args = {
        clientId: 'c',
        code: 'the-code',
        codeVerifier: 'the-verifier',
      };
      let thrown: unknown;
      try {
        await exchangeMalCodeForToken(args);
      } catch (err) {
        thrown = err;
      }
      const message = (thrown as Error).message;
      expect(message).toMatch(/status 400/);
      // The thrown error must not leak any submitted secret value.
      expect(message).not.toContain('the-code');
      expect(message).not.toContain('the-verifier');
    });
  });

  describe('refreshMalToken', () => {
    it('POSTs the refresh_token grant and returns the rotated pair', async () => {
      fetchMock.mockResolvedValue(
        okJson({ ...tokenBody, access_token: 'new-access', refresh_token: 'new-refresh' })
      );

      const result = await refreshMalToken({ clientId: 'client-1', refreshToken: 'old-refresh' });
      expect(result).toEqual({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
        expiresIn: 2_592_000,
      });

      const body = decodeBody(fetchMock.mock.calls[0]);
      expect(body).toMatchObject({
        grant_type: 'refresh_token',
        client_id: 'client-1',
        refresh_token: 'old-refresh',
      });
      expect(body).not.toHaveProperty('client_secret');
    });
  });
});
