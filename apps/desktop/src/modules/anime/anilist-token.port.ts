/**
 * Port the anime module uses to obtain the user's AniList OAuth access token.
 *
 * The Electron main process passes a concrete implementation to the
 * services from the composition root (`main/backend.ts`). This inverts the dependency so `modules/anime` never
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
