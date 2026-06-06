jest.mock('electron');

// Spy on the logger while keeping the real shared constants / buildMalAuthorizeUrl.
const logSpies = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
jest.mock('@shiroani/shared', () => ({
  ...jest.requireActual('@shiroani/shared'),
  createLogger: () => logSpies,
}));

import { BrowserWindow } from 'electron';
import { parseAuthCode, startMalOAuth } from '../mal-oauth';

describe('parseAuthCode', () => {
  const redirect = 'http://localhost:53682/callback';

  it('parses a valid authorization-code QUERY (code + state)', () => {
    const url = `${redirect}?code=auth-code-123&state=csrf-xyz`;
    expect(parseAuthCode(url)).toEqual({ code: 'auth-code-123', state: 'csrf-xyz' });
  });

  it('returns null when there is no query', () => {
    expect(parseAuthCode(redirect)).toBeNull();
  });

  it('returns null when the code is missing', () => {
    expect(parseAuthCode(`${redirect}?state=csrf-xyz`)).toBeNull();
  });

  it('returns null when the state is missing', () => {
    expect(parseAuthCode(`${redirect}?code=auth-code-123`)).toBeNull();
  });

  it('returns null for an unparseable URL', () => {
    expect(parseAuthCode('not a url')).toBeNull();
  });

  it('returns null for a non-string input', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(parseAuthCode(undefined as any)).toBeNull();
  });

  it('reads the code from the QUERY even if a fragment is present (MAL uses query, not fragment)', () => {
    const url = `${redirect}?code=q-code&state=q-state#access_token=should-be-ignored`;
    expect(parseAuthCode(url)).toEqual({ code: 'q-code', state: 'q-state' });
  });
});

describe('startMalOAuth never-log / never-leak', () => {
  beforeEach(() => {
    Object.values(logSpies).forEach(fn => fn.mockReset());
  });

  afterEach(() => {
    // Restore the default resolving loadURL so this rejecting stub never bleeds
    // into other suites sharing the electron mock within this file.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (BrowserWindow as any).__loadURLImpl = () => Promise.resolve();
  });

  it('never leaks the PKCE code_verifier into the rejection reason or logs when loadURL fails', async () => {
    let capturedVerifier: string | null = null;

    // Capture the verifier from the authorize URL (plain PKCE → challenge === verifier),
    // then reject loadURL with an error whose message embeds the FULL url (as
    // Electron's loadURL rejection can), to prove it is never re-surfaced.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (BrowserWindow as any).__loadURLImpl = (url: string) => {
      const verifier = new URL(url).searchParams.get('code_challenge');
      capturedVerifier = verifier;
      return Promise.reject(
        Object.assign(new Error(`net::ERR_FAILED loading '${url}'`), { code: 'ERR_FAILED' })
      );
    };

    let reason = '';
    try {
      await startMalOAuth('client-1');
    } catch (err) {
      reason = (err as Error).message;
    }

    expect(capturedVerifier).toBeTruthy();
    const verifier = capturedVerifier as unknown as string;

    // Surfaces the error CODE only — never the URL/verifier.
    expect(reason).toMatch(/Failed to open MAL authorization page/);
    expect(reason).toContain('ERR_FAILED');
    expect(reason).not.toContain(verifier);

    // No logger call may carry the verifier either.
    const allLogArgs = Object.values(logSpies)
      .flatMap(spy => spy.mock.calls)
      .map(args => JSON.stringify(args))
      .join('|');
    expect(allLogArgs).not.toContain(verifier);
  });
});
