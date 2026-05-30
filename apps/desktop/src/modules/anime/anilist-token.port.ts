/**
 * Port the anime module uses to obtain the user's AniList OAuth access token.
 *
 * The Electron main process registers a concrete implementation at bootstrap
 * (the desktop OAuth slice provides a safeStorage-backed `useClass` in
 * `main/index.ts`). This inverts the dependency so `modules/anime` never
 * imports from `main/`, mirroring `NotificationHostPort` / `NotificationStorePort`.
 *
 * The token NEVER crosses IPC — it stays inside the main process and is only
 * read here to authenticate outbound AniList GraphQL requests.
 */
export abstract class AniListTokenPort {
  /**
   * Resolve the current AniList access token, or `null` when the user has not
   * connected an account (or the token is missing/expired).
   */
  abstract getAccessToken(): Promise<string | null>;
}

/**
 * Contract-phase no-op default so the anime module typechecks and boots before
 * the desktop OAuth slice wires the real provider. Always reports "not
 * connected" — AniListClient simply makes unauthenticated requests.
 *
 * DESKTOP SLICE: replace the `useClass` in `main/index.ts` (see
 * `bootstrapNestApp`) with the safeStorage-backed implementation. Do NOT use
 * this stub in production.
 */
export class NoopAniListTokenPort extends AniListTokenPort {
  async getAccessToken(): Promise<string | null> {
    return null;
  }
}
