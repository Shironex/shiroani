import { ipcMain } from 'electron';
import { createMainLogger } from '../logging/logger';
import { handleWithFallback } from './with-ipc-handler';
import { appFetchImageBase64Schema } from './schemas';

const logger = createMainLogger('IPC:App');

// ── app:fetch-image-base64 security limits ──────────────────────────────
// Keep in lock-step with the documented threat model: renderer-driven fetches
// of remote images (AniList covers/avatars) for canvas-composed profile cards.
// Anything larger than this is almost certainly not an AniList cover.
const FETCH_IMAGE_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const FETCH_IMAGE_TIMEOUT_MS = 8_000;

/**
 * Allowlisted host suffixes for `app:fetch-image-base64`.
 *
 * The only current caller is the profile-card canvas (AniList covers/avatars +
 * Google favicons). Keep the list narrow and add hosts only when a new,
 * main-process-fetched image source is intentionally introduced.
 */
const FETCH_IMAGE_HOST_SUFFIXES: readonly string[] = [
  '.anilist.co', // AniList CDN — s4.anilist.co covers, avatars
  'anilist.co',
  '.google.com', // Google favicon service (www.google.com/s2/favicons)
  'google.com',
  '.gstatic.com', // Google static assets (occasional redirect target)
  'gstatic.com',
];

/**
 * Block literal private, loopback, and link-local addresses. We don't do DNS
 * resolution (the OS fetch happens after this check and would race anyway);
 * this is a defence-in-depth layer against URLs that use literal IPs.
 *
 * Covers IPv4 RFC1918 (`10/8`, `172.16/12`, `192.168/16`), loopback (`127/8`),
 * link-local (`169.254/16`), the `::1` IPv6 loopback, and the `fd00::/8`
 * IPv6 ULA range.
 */
function isPrivateHostLiteral(host: string): boolean {
  const normalized = host.trim().toLowerCase();
  if (!normalized) return true;

  // IPv6: strip brackets if present (URL.hostname for [::1] returns '[::1]')
  const unbracketed =
    normalized.startsWith('[') && normalized.endsWith(']') ? normalized.slice(1, -1) : normalized;

  if (unbracketed === '::1' || unbracketed === '::') return true;
  // IPv6 ULA fd00::/8 — hex byte starting with 'fc' or 'fd'
  if (/^f[cd][0-9a-f]{0,2}:/.test(unbracketed)) return true;
  // IPv6 link-local fe80::/10
  if (/^fe[89ab][0-9a-f]?:/.test(unbracketed)) return true;

  // IPv4 dotted-quad checks
  const ipv4 = unbracketed.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [, aStr, bStr] = ipv4;
    const a = Number(aStr);
    const b = Number(bStr);
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
  }

  // Hostnames that should never be fetched
  if (unbracketed === 'localhost' || unbracketed.endsWith('.localhost')) return true;

  return false;
}

/** Whether `host` matches one of the configured allowlist suffixes. */
function isAllowedImageHost(host: string): boolean {
  const normalized = host.trim().toLowerCase();
  if (!normalized) return false;
  return FETCH_IMAGE_HOST_SUFFIXES.some(suffix =>
    suffix.startsWith('.') ? normalized.endsWith(suffix) : normalized === suffix
  );
}

/**
 * Register the `app:fetch-image-base64` IPC handler.
 */
export function registerAppImageFetchHandlers(): void {
  handleWithFallback(
    'app:fetch-image-base64',
    async (_event, url): Promise<string | null> => {
      let parsed: URL;
      try {
        parsed = new URL(url);
      } catch {
        return null;
      }
      if (parsed.protocol !== 'https:') return null;

      // SSRF guard: reject private/loopback/link-local literals so a renderer
      // can't coerce the main process into probing LAN HTTPS services.
      if (isPrivateHostLiteral(parsed.hostname)) {
        logger.warn(
          `[security] Blocked app:fetch-image-base64 for private host: ${parsed.hostname}`
        );
        return null;
      }

      // Host allowlist: keep this tight — the only current caller is the
      // profile-card canvas (AniList covers/avatars + Google favicons).
      if (!isAllowedImageHost(parsed.hostname)) {
        logger.warn(
          `[security] Blocked app:fetch-image-base64 for non-allowlisted host: ${parsed.hostname}`
        );
        return null;
      }

      try {
        // Manual redirect loop: validate every Location hop before following so
        // a redirecting CDN can never coerce the main process into probing a
        // private host (the redirect: 'follow' path makes the hop request
        // before we can inspect the destination).
        const MAX_REDIRECTS = 5;
        let currentUrl = url;
        let res!: Response;
        for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
          res = await fetch(currentUrl, {
            signal: AbortSignal.timeout(FETCH_IMAGE_TIMEOUT_MS),
            redirect: 'manual',
          });
          if (res.status < 300 || res.status >= 400) break;
          const location = res.headers.get('location');
          if (!location) return null;
          let nextUrl: URL;
          try {
            nextUrl = new URL(location, currentUrl);
          } catch {
            return null;
          }
          if (
            nextUrl.protocol !== 'https:' ||
            isPrivateHostLiteral(nextUrl.hostname) ||
            !isAllowedImageHost(nextUrl.hostname)
          ) {
            logger.warn(
              `[security] Blocked app:fetch-image-base64 redirect to disallowed host: ${nextUrl.hostname}`
            );
            return null;
          }
          if (hop === MAX_REDIRECTS) {
            logger.warn('[security] Blocked app:fetch-image-base64 redirect chain too long');
            return null;
          }
          currentUrl = nextUrl.href;
        }
        if (!res.ok) return null;

        // Content-Type must declare an image. Rejects HTML/JSON/etc. that
        // a misconfigured allowlisted host might serve.
        const contentTypeHeader = res.headers.get('content-type') ?? '';
        if (!contentTypeHeader.toLowerCase().startsWith('image/')) {
          logger.warn(
            `[security] Blocked app:fetch-image-base64 non-image content-type: ${contentTypeHeader}`
          );
          return null;
        }

        // Size cap: reject early via Content-Length when present, otherwise
        // enforce against the downloaded buffer. AniList covers are ~100KB;
        // 5 MB is a comfortable ceiling that still blocks abuse.
        const declaredLength = Number(res.headers.get('content-length') ?? '');
        if (Number.isFinite(declaredLength) && declaredLength > FETCH_IMAGE_MAX_BYTES) {
          logger.warn(
            `[security] Blocked app:fetch-image-base64 oversized content-length: ${declaredLength}`
          );
          return null;
        }

        // Stream body with a running byte count so we never allocate more than
        // FETCH_IMAGE_MAX_BYTES regardless of whether Content-Length was present.
        if (!res.body) return null;
        const reader = res.body.getReader();
        const chunks: Uint8Array[] = [];
        let totalBytes = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          totalBytes += value.byteLength;
          if (totalBytes > FETCH_IMAGE_MAX_BYTES) {
            await reader.cancel();
            logger.warn(
              `[security] Blocked app:fetch-image-base64 oversized stream: >${FETCH_IMAGE_MAX_BYTES} bytes`
            );
            return null;
          }
          chunks.push(value);
        }
        const buffer = Buffer.concat(chunks.map(c => Buffer.from(c)));

        // Strip any parameters from content-type (e.g. "image/jpeg; charset=x")
        // before echoing into the data URL — keeps the result canonical.
        const mime = contentTypeHeader.split(';')[0].trim() || 'image/jpeg';
        return `data:${mime};base64,${buffer.toString('base64')}`;
      } catch (error) {
        logger.warn(`Failed to fetch image: ${url}`, error);
        return null;
      }
    },
    () => null,
    { schema: appFetchImageBase64Schema }
  );
}

/**
 * Clean up the image-fetch IPC handler.
 */
export function cleanupAppImageFetchHandlers(): void {
  ipcMain.removeHandler('app:fetch-image-base64');
}
