/**
 * Shared Chrome User-Agent construction for the main process.
 *
 * Used both for Electron's global `app.userAgentFallback` (so "Electron/<v>"
 * and the app name never leak in subframe/worker requests) and for the
 * browser tab session's `setUserAgent`, so embedded Chromium is presented as
 * plain Chrome and isn't caught by Electron-detection / Cloudflare Turnstile
 * fingerprinting.
 */

/** Pinned Chromium version, falling back to a recent default if unavailable. */
function chromeVersion(): string {
  return process.versions.chrome || '134.0.0.0';
}

/**
 * Platform-specific OS token for a desktop Chrome UA string. macOS and Linux
 * are reported faithfully; everything else is presented as Windows 10 x64.
 */
export function getOsSlug(platform: NodeJS.Platform = process.platform): string {
  if (platform === 'darwin') return 'Macintosh; Intel Mac OS X 10_15_7';
  if (platform === 'linux') return 'X11; Linux x86_64';
  return 'Windows NT 10.0; Win64; x64';
}

/** Build the full desktop Chrome User-Agent string for the given platform. */
export function buildChromeUserAgent(platform: NodeJS.Platform = process.platform): string {
  return `Mozilla/5.0 (${getOsSlug(platform)}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion()} Safari/537.36`;
}
