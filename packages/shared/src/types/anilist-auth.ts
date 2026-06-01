/**
 * AniList OAuth (implicit grant) auth contract shared between the desktop main
 * process, the preload bridge, and the web renderer.
 *
 * The access token NEVER crosses the IPC boundary — the main process holds it
 * (safeStorage-backed) and the renderer only ever receives an
 * {@link AniListAuthStatus}. These types describe what the renderer is allowed
 * to see about the connection.
 */

/** Public-facing AniList account info surfaced in the UI after connecting. */
export interface AniListViewer {
  id: number;
  name: string;
  avatar?: string;
  bannerImage?: string;
}

/**
 * Connection status the renderer observes. `connected` is the single source of
 * truth for UI gating; `viewer` / `expiresAt` are only present when connected.
 */
export interface AniListAuthStatus {
  connected: boolean;
  viewer?: AniListViewer;
  /** Unix epoch milliseconds the token expires (implicit grant ~1yr, no refresh). */
  expiresAt?: number;
}
