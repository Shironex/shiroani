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
