import { safeStorage } from 'electron';
import type { MalAuthStatus, MalViewer } from '@shiroani/shared';
import { createLogger } from '@shiroani/shared';
import { store } from '../store';

const logger = createLogger('MalTokenStore');

/**
 * electron-store key for the persisted MAL session.
 *
 * This is accessed DIRECTLY from the main process via the shared `store`
 * instance, which bypasses the renderer-facing `store:get/set` allowlist in
 * `ipc/store.ts` (that allowlist only guards IPC traffic from the renderer).
 * No `ALLOWED_STORE_KEYS` entry is needed — and deliberately none is added, so
 * the tokens can never be read or written through the renderer IPC surface.
 * Mirrors the AniList session key.
 */
const SESSION_KEY = 'mal-session';

interface PersistedSession {
  /**
   * Encrypted access token, base64-encoded.
   *
   * When `encrypted` is true this is `safeStorage.encryptString(token)` →
   * base64. When `encrypted` is false (no OS encryption backend available, e.g.
   * some Linux setups), this is the PLAINTEXT token and we flag it so the risk
   * is explicit and auditable.
   */
  accessToken: string;
  /**
   * Encrypted refresh token, base64-encoded (same `encrypted` flag governs it).
   * UNLIKE AniList (implicit grant, no refresh token), MAL issues a refresh
   * token that outlives the access token (~1mo) — it is the MORE sensitive
   * secret, so it is encrypted alongside the access token, never stored bare.
   */
  refreshToken: string;
  encrypted: boolean;
  /** Unix epoch ms the ACCESS token expires. */
  expiresAt: number;
  /** Optional cached viewer (absent if the viewer fetch failed at connect). */
  viewer?: MalViewer;
}

/** The decrypted session a main-process caller (e.g. the token adapter) needs. */
export interface MalSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  viewer?: MalViewer;
}

/**
 * Monotonic counter bumped on every {@link clear} (disconnect). The token
 * adapter captures it before a refresh and re-checks it before persisting the
 * rotated tokens, so a disconnect that lands MID-refresh is not silently undone
 * by the in-flight refresh writing a fresh session back (which would resurrect a
 * connection the user explicitly ended). In-memory by design — a process
 * restart resets it, which is fine: no refresh can be in flight across restarts.
 */
let sessionEpoch = 0;

/** Read the current disconnect epoch (see {@link sessionEpoch}). */
export function getSessionEpoch(): number {
  return sessionEpoch;
}

function readPersisted(): PersistedSession | null {
  const raw = store.get(SESSION_KEY) as PersistedSession | undefined;
  if (
    !raw ||
    typeof raw.accessToken !== 'string' ||
    typeof raw.refreshToken !== 'string' ||
    typeof raw.expiresAt !== 'number' ||
    !Number.isFinite(raw.expiresAt) ||
    typeof raw.encrypted !== 'boolean'
  ) {
    return null;
  }
  return raw;
}

/** Decrypt one stored token, honoring the `encrypted` flag. Returns null on failure. */
function decryptToken(value: string, encrypted: boolean): string | null {
  if (!encrypted) {
    return value;
  }
  try {
    return safeStorage.decryptString(Buffer.from(value, 'base64'));
  } catch (err) {
    logger.warn('Failed to decrypt MAL token; treating as disconnected', err);
    return null;
  }
}

/**
 * Persist the access + refresh tokens, the access-token expiry, and the cached
 * viewer.
 *
 * Encrypts BOTH tokens with the OS keychain (macOS) / DPAPI (Windows) via
 * `safeStorage` when available. If encryption is unavailable, falls back to
 * storing plaintext and flags it (`encrypted: false`) with a logged warning —
 * chosen over refusing to connect so the feature still works on platforms
 * without a backend, while keeping the degraded state explicit.
 *
 * @param tokens     fresh access + refresh pair (from exchange or refresh)
 * @param expiresIn  access-token lifetime in seconds (read at runtime from MAL)
 * @param viewer     cached viewer; carry the existing one on refresh to avoid
 *                   nulling it (the refresh grant returns no user info)
 */
export function saveSession(
  tokens: { accessToken: string; refreshToken: string },
  expiresIn: number,
  viewer?: MalViewer
): void {
  const expiresAt = Date.now() + Math.max(0, expiresIn) * 1000;

  let accessToken: string;
  let refreshToken: string;
  let encrypted: boolean;

  if (safeStorage.isEncryptionAvailable()) {
    accessToken = safeStorage.encryptString(tokens.accessToken).toString('base64');
    refreshToken = safeStorage.encryptString(tokens.refreshToken).toString('base64');
    encrypted = true;
  } else {
    logger.warn(
      'safeStorage encryption is unavailable on this platform — persisting MAL tokens in plaintext (flagged). Consider an OS keychain backend.'
    );
    accessToken = tokens.accessToken;
    refreshToken = tokens.refreshToken;
    encrypted = false;
  }

  const session: PersistedSession = { accessToken, refreshToken, encrypted, expiresAt, viewer };
  store.set(SESSION_KEY, session);
  // Never log the tokens themselves.
  logger.info('MAL session saved');
}

/**
 * Return the full decrypted session (both tokens + expiry + viewer), or `null`
 * when not connected. Does NOT check expiry — the adapter decides whether the
 * access token needs a lazy refresh, and the refresh token outlives the access
 * token, so an expired access token does not mean "disconnected".
 */
export function getSession(): MalSession | null {
  const persisted = readPersisted();
  if (!persisted) {
    return null;
  }
  const accessToken = decryptToken(persisted.accessToken, persisted.encrypted);
  const refreshToken = decryptToken(persisted.refreshToken, persisted.encrypted);
  if (accessToken === null || refreshToken === null) {
    return null;
  }
  return {
    accessToken,
    refreshToken,
    expiresAt: persisted.expiresAt,
    viewer: persisted.viewer,
  };
}

/**
 * Return the renderer-safe connection status. NEVER includes either token.
 *
 * Reports `connected: true` whenever a session is persisted — even if the
 * access token is past `expiresAt` — because the refresh token (longer-lived)
 * can renew it transparently. Only a cleared/absent session is "disconnected".
 */
export function getStatus(): MalAuthStatus {
  const persisted = readPersisted();
  if (!persisted) {
    return { connected: false };
  }
  return {
    connected: true,
    viewer: persisted.viewer,
    expiresAt: persisted.expiresAt,
  };
}

/**
 * Remove the persisted session (disconnect).
 */
export function clear(): void {
  store.delete(SESSION_KEY);
  // Invalidate any in-flight refresh so it does not re-persist a session the
  // user just disconnected (see sessionEpoch).
  sessionEpoch += 1;
  logger.info('MAL session cleared');
}
