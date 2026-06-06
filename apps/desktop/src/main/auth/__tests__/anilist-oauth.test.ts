jest.mock('electron');

import { parseTokenFragment } from '../anilist-oauth';

describe('parseTokenFragment', () => {
  const redirect = 'https://shiroani.app/oauth/anilist';

  it('parses a valid implicit-grant fragment', () => {
    const url = `${redirect}#access_token=abc123&token_type=Bearer&expires_in=31536000`;
    expect(parseTokenFragment(url)).toEqual({
      accessToken: 'abc123',
      tokenType: 'Bearer',
      expiresIn: 31536000,
    });
  });

  it('returns null when there is no fragment', () => {
    expect(parseTokenFragment(redirect)).toBeNull();
  });

  it('returns null when the access token is missing', () => {
    expect(parseTokenFragment(`${redirect}#token_type=Bearer&expires_in=100`)).toBeNull();
  });

  it('returns null for an empty fragment', () => {
    expect(parseTokenFragment(`${redirect}#`)).toBeNull();
  });

  it('returns null for a non-string input', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(parseTokenFragment(undefined as any)).toBeNull();
  });

  it('defaults token_type to Bearer and falls back to the default TTL when expires_in is absent', () => {
    const url = `${redirect}#access_token=tok&state=xyz&foo=bar`;
    expect(parseTokenFragment(url)).toEqual({
      accessToken: 'tok',
      tokenType: 'Bearer',
      // AniList implicit tokens last ~1 year; a missing expires_in falls back to it.
      expiresIn: 365 * 24 * 60 * 60,
    });
  });

  it('falls back to the default TTL for a malformed expires_in', () => {
    const url = `${redirect}#access_token=tok&token_type=Bearer&expires_in=notanumber`;
    expect(parseTokenFragment(url)?.expiresIn).toBe(365 * 24 * 60 * 60);
  });

  it('ignores a fragment from a different (non-redirect) URL but still parses the token', () => {
    // parseTokenFragment is URL-agnostic by design; the redirect-URI gate lives
    // in the navigation handler, not here.
    const url = `https://anilist.co/somewhere#access_token=zzz`;
    expect(parseTokenFragment(url)?.accessToken).toBe('zzz');
  });
});
