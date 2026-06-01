import { safeStorage } from 'electron';
import type { AniListAuthStatus, AniListViewer } from '@shiroani/shared';
import { createLogger } from '@shiroani/shared';
import { store } from '../store';

const logger = createLogger('AniListTokenStore');

/**
 * electron-store key for the persisted AniList session.
 *
 * This is accessed DIRECTLY from the main process via the shared `store`
 * instance, which bypasses the renderer-facing `store:get/set` allowlist in
 * `ipc/store.ts` (that allowlist only guards IPC traffic from the renderer).
 * No `ALLOWED_STORE_KEYS` entry is needed — and deliberately none is added, so
 * the token can never be read or written through the renderer IPC surface.
 */
const SESSION_KEY = 'anilist-session';

interface PersistedSession {
  /**
   * Encrypted access token, base64-encoded.
   *
   * When `encrypted` is true this is `safeStorage.encryptString(token)` →
   * base64. When `encrypted` is false (no OS encryption backend available, e.g.
   * some Linux setups), this is the PLAINTEXT token and we flag it so the risk
   * is explicit and auditable.
   */
  token: string;
  encrypted: boolean;
  /** Unix epoch ms the token expires. */
  expiresAt: number;
  viewer: AniListViewer;
}

function readSession(): PersistedSession | null {
  const raw = store.get(SESSION_KEY) as PersistedSession | undefined;
  if (!raw || typeof raw.token !== 'string' || typeof raw.expiresAt !== 'number') {
    return null;
  }
  return raw;
}

/**
 * Persist the access token, its expiry, and the cached viewer.
 *
 * Encrypts the token with the OS keychain (macOS) / DPAPI (Windows) via
 * `safeStorage` when available. If encryption is unavailable, falls back to
 * storing plaintext and flags it (`encrypted: false`) with a logged warning —
 * chosen over refusing to connect so the feature still works on platforms
 * without a backend, while keeping the degraded state explicit.
 */
export function saveSession(token: string, expiresIn: number, viewer: AniListViewer): void {
  const expiresAt = Date.now() + Math.max(0, expiresIn) * 1000;

  let stored: string;
  let encrypted: boolean;

  if (safeStorage.isEncryptionAvailable()) {
    stored = safeStorage.encryptString(token).toString('base64');
    encrypted = true;
  } else {
    logger.warn(
      'safeStorage encryption is unavailable on this platform — persisting AniList token in plaintext (flagged). Consider an OS keychain backend.'
    );
    stored = token;
    encrypted = false;
  }

  const session: PersistedSession = { token: stored, encrypted, expiresAt, viewer };
  store.set(SESSION_KEY, session);
  // Never log the token itself.
  logger.info('AniList session saved');
}

/**
 * Return the decrypted access token, or `null` when not connected or expired.
 */
export function getToken(): string | null {
  const session = readSession();
  if (!session) {
    return null;
  }
  if (Date.now() >= session.expiresAt) {
    logger.info('AniList token expired');
    return null;
  }

  if (!session.encrypted) {
    return session.token;
  }

  try {
    return safeStorage.decryptString(Buffer.from(session.token, 'base64'));
  } catch (err) {
    logger.warn('Failed to decrypt AniList token; treating as disconnected', err);
    return null;
  }
}

/**
 * Return the renderer-safe connection status. NEVER includes the token.
 */
export function getStatus(): AniListAuthStatus {
  const session = readSession();
  if (!session || Date.now() >= session.expiresAt) {
    return { connected: false };
  }
  return {
    connected: true,
    viewer: session.viewer,
    expiresAt: session.expiresAt,
  };
}

/**
 * Remove the persisted session (disconnect).
 */
export function clear(): void {
  store.delete(SESSION_KEY);
  logger.info('AniList session cleared');
}
