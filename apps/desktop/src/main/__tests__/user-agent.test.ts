import { buildFirefoxUserAgent, stripEmbedderTokens } from '../user-agent';

describe('buildFirefoxUserAgent', () => {
  it.each([
    ['darwin', 'Macintosh; Intel Mac OS X 10.15'],
    ['win32', 'Windows NT 10.0; Win64; x64'],
    ['linux', 'X11; Linux x86_64'],
  ] as const)('formats the %s string with its rv token', (platform, os) => {
    expect(buildFirefoxUserAgent(platform)).toBe(
      `Mozilla/5.0 (${os}; rv:137.0) Gecko/20100101 Firefox/137.0`
    );
  });
});

const CHROME =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.167 Safari/537.36';

describe('stripEmbedderTokens', () => {
  it('removes the app and Electron tokens', () => {
    const ua =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) ShiroAni/1.3.1 Chrome/152.0.7977.167 Electron/44.9.3 Safari/537.36';
    expect(stripEmbedderTokens(ua)).toBe(CHROME);
  });

  it('handles an app name containing spaces', () => {
    const ua =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Shiro Ani/1.0.0 Chrome/152.0.7977.167 Electron/44.9.3 Safari/537.36';
    expect(stripEmbedderTokens(ua)).toBe(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.7977.167 Safari/537.36'
    );
  });

  it('leaves an already clean UA unchanged', () => {
    expect(stripEmbedderTokens(CHROME)).toBe(CHROME);
  });

  it('still removes the Electron token from an unexpected format', () => {
    expect(stripEmbedderTokens('Custom/1.0 Electron/44.9.3')).toBe('Custom/1.0');
  });
});
