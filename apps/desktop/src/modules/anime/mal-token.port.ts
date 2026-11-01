/**
 * Port the anime module uses to obtain the user's MAL OAuth access token.
 *
 * The Electron main process passes a concrete implementation to the
 * services from the composition root (`main/backend.ts`). This inverts the dependency so `modules/anime` never imports
 * from `main/`, mirroring {@link AniListTokenPort} / `NotificationHostPort`.
 *
 * Neither token EVER crosses IPC — they stay inside the main process and the
 * access token is only read here to authenticate outbound MAL API requests. The
 * concrete adapter refreshes lazily (rotating BOTH tokens) when the access token
 * is expired/near-expiry, so callers always receive a usable token.
 */
export abstract class MalTokenPort {
  /**
   * Resolve the current MAL access token, or `null` when the user has not
   * connected an account (or the refresh failed). May trigger a lazy,
   * concurrency-safe refresh under the hood.
   */
  abstract getAccessToken(): Promise<string | null>;
}
