/**
 * User-Agent cleanup for the main process.
 *
 * Electron's default UA is Chrome's plus an app-name token and `Electron/<v>`.
 * Cloudflare Turnstile fails on those tokens, so they are removed from
 * `app.userAgentFallback`, which also covers subframe and worker requests.
 * Everything else stays as Chromium reports it, so the string cannot drift from
 * the real OS or engine version.
 */

const CHROME_UA_PARTS =
  /^(Mozilla\/5\.0 \([^)]*\) AppleWebKit\/\S+ \(KHTML, like Gecko\)).*?( Chrome\/\S+).*?( Safari\/\S+)/;

/** Reduce a Chromium-based UA to the tokens plain Chrome sends. */
export function stripEmbedderTokens(userAgent: string): string {
  const parts = CHROME_UA_PARTS.exec(userAgent);
  if (!parts) return userAgent.replace(/ Electron\/\S+/, '');
  return `${parts[1]}${parts[2]}${parts[3]}`;
}

const FIREFOX_VERSION = '137.0';

/** Firefox's UA for the given platform, used only where Google blocks embedded Chromium. */
export function buildFirefoxUserAgent(platform: NodeJS.Platform = process.platform): string {
  let os = 'Windows NT 10.0; Win64; x64';
  if (platform === 'darwin') os = 'Macintosh; Intel Mac OS X 10.15';
  else if (platform === 'linux') os = 'X11; Linux x86_64';
  return `Mozilla/5.0 (${os}; rv:${FIREFOX_VERSION}) Gecko/20100101 Firefox/${FIREFOX_VERSION}`;
}
