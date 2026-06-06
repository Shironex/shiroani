/**
 * Port the anime module uses to obtain the user's MAL OAuth access token.
 *
 * The Electron main process registers a concrete implementation at bootstrap
 * (the desktop OAuth slice provides a safeStorage-backed `useClass` in
 * `main/index.ts`). This inverts the dependency so `modules/anime` never imports
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

/**
 * Contract-phase no-op default so the anime module typechecks and boots before
 * the desktop OAuth slice wires the real provider. Always reports "not
 * connected" — a MAL client simply makes unauthenticated/public requests.
 *
 * DESKTOP SLICE: replace the `useClass` in `main/index.ts` (see
 * `bootstrapNestApp`) with the safeStorage-backed implementation. Do NOT use
 * this stub in production.
 */
export class NoopMalTokenPort extends MalTokenPort {
  async getAccessToken(): Promise<string | null> {
    return null;
  }
}
