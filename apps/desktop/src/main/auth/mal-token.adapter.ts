import { Injectable } from '@nestjs/common';
import type { MalViewer } from '@shiroani/shared';
import { DEFAULT_MAL_CLIENT_ID, createLogger } from '@shiroani/shared';
import { MalTokenPort } from '../../modules/anime/mal-token.port';
import { getSession, getSessionEpoch, saveSession } from './mal-token-store';
import { refreshMalToken } from './mal-token-request';

const logger = createLogger('MalTokenAdapter');

/**
 * Refresh the access token this many milliseconds BEFORE it actually expires, so
 * an in-flight request never races the expiry boundary. 60s comfortably covers
 * request latency and minor clock skew.
 */
const EXPIRY_SKEW_MS = 60 * 1000;

function resolveClientId(): string {
  return process.env.MAL_CLIENT_ID || DEFAULT_MAL_CLIENT_ID;
}

function resolveClientSecret(): string | undefined {
  return process.env.MAL_CLIENT_SECRET || undefined;
}

/**
 * Concrete {@link MalTokenPort} wired into the Nest container at bootstrap (see
 * `main/index.ts` `malTokenProvider`). Reads the safeStorage-backed tokens from
 * the main-process token store and LAZILY refreshes the access token when it is
 * expired/near-expiry, rotating BOTH tokens.
 *
 * Neither token crosses IPC — both stay inside the main process; only the access
 * token is returned to in-process callers (the MAL client).
 *
 * Concurrency: a single in-flight refresh promise is shared across concurrent
 * callers so a burst of requests triggers exactly ONE refresh. MAL rotates the
 * refresh token on every refresh, so a double-refresh would rotate (and thereby
 * invalidate) the refresh token twice and wedge the session.
 */
@Injectable()
export class ElectronMalTokenAdapter extends MalTokenPort {
  /**
   * The shared in-flight refresh, or null when no refresh is running. Cleared in
   * a `finally` (success AND failure) so a failed refresh never leaves a
   * permanently-rejected promise cached, which would wedge every future call.
   */
  private refreshInFlight: Promise<string | null> | null = null;

  async getAccessToken(): Promise<string | null> {
    const session = getSession();
    if (!session) {
      return null;
    }

    // Access token still comfortably valid → use it as-is, no network call.
    if (Date.now() < session.expiresAt - EXPIRY_SKEW_MS) {
      return session.accessToken;
    }

    // Expired/near-expiry → lazy refresh, joining any in-flight refresh so
    // concurrent callers share one network round-trip and one token rotation.
    if (!this.refreshInFlight) {
      this.refreshInFlight = this.performRefresh(session.refreshToken, session.viewer).finally(
        () => {
          this.refreshInFlight = null;
        }
      );
    }
    return this.refreshInFlight;
  }

  /**
   * Run the refresh grant, persist+rotate BOTH tokens (carrying the existing
   * viewer so it is not nulled), and return the fresh access token. Returns
   * `null` when the client id is unconfigured or the refresh fails — the caller
   * then proceeds unauthenticated rather than crashing.
   */
  private async performRefresh(
    refreshToken: string,
    viewer: MalViewer | undefined
  ): Promise<string | null> {
    const clientId = resolveClientId();
    if (!clientId) {
      logger.warn('MAL client id is not configured; cannot refresh access token');
      return null;
    }

    // Capture the disconnect epoch BEFORE the network round-trip so a disconnect
    // landing mid-refresh is detected and the rotated tokens are NOT persisted
    // (which would resurrect a session the user explicitly ended).
    const epochBeforeRefresh = getSessionEpoch();

    try {
      const tokens = await refreshMalToken({
        clientId,
        clientSecret: resolveClientSecret(),
        refreshToken,
      });
      if (getSessionEpoch() !== epochBeforeRefresh) {
        // User disconnected while the refresh was in flight — honor it. Return
        // the fresh token to THIS caller (so an outstanding request can still
        // complete) but do not write it back to the cleared store.
        logger.info('MAL session was disconnected during refresh; not persisting rotated tokens');
        return tokens.accessToken;
      }
      // Rotate BOTH tokens; preserve the cached viewer (refresh returns no user).
      saveSession(
        { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken },
        tokens.expiresIn,
        viewer
      );
      logger.info('MAL access token refreshed');
      return tokens.accessToken;
    } catch (err) {
      // Never log the token; surface only the failure.
      logger.warn('MAL token refresh failed; treating as unauthenticated', err);
      return null;
    }
  }
}
