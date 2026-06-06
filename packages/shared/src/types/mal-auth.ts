/**
 * MyAnimeList (MAL) OAuth auth contract shared between the desktop main process,
 * the preload bridge, and the web renderer.
 *
 * Neither the access token nor the refresh token EVER crosses the IPC boundary
 * — the main process holds both (safeStorage-backed) and the renderer only ever
 * receives a {@link MalAuthStatus}. These types describe what the renderer is
 * allowed to see about the connection.
 *
 * Mirrors the AniList auth contract ({@link AniListViewer} /
 * {@link AniListAuthStatus}); MAL adds a refresh token internally but exposes
 * the same renderer-safe status surface.
 */

/** Public-facing MAL account info surfaced in the UI after connecting. */
export interface MalViewer {
  id: number;
  name: string;
  /** Profile picture URL (MAL user object `picture` field). */
  avatar?: string;
}

/**
 * Connection status the renderer observes. `connected` is the single source of
 * truth for UI gating; `viewer` / `expiresAt` are only present when connected.
 * `expiresAt` reflects the ACCESS token's expiry — a refresh token (held
 * main-side, never exposed) can renew it transparently before it lapses.
 */
export interface MalAuthStatus {
  connected: boolean;
  viewer?: MalViewer;
  /** Unix epoch milliseconds the access token expires. */
  expiresAt?: number;
}

/**
 * The connected MAL viewer's THIN profile: the {@link MalViewer} identity plus
 * exactly the 15 scalar fields MAL returns under the
 * `@me?fields=anime_statistics` blob, mapped 1:1 (no derived/aggregated values
 * added). Returned by the `mal:get-viewer-profile` event, or `null` when no MAL
 * account is connected.
 *
 * Deliberately THIN, NOT AniList-parity: there are no genre/format/score
 * breakdowns, no favourites, and no other-user lookup — the MAL v2 API only
 * exposes these scalars for the `@me` viewer. The day counts (`num_days*`) are
 * fractional days MAL itself computes; the app does not recompute them. The
 * 15 stats live flat on this type (alongside `viewer`) so the frontend reads
 * `stats.num_items` + `stats.viewer.name` from one object.
 */
export interface MalUserStats {
  /** The connected account (id / name / optional avatar). */
  viewer: MalViewer;
  /** Anime currently `watching`. */
  num_items_watching: number;
  /** Anime `completed`. */
  num_items_completed: number;
  /** Anime `on_hold`. */
  num_items_on_hold: number;
  /** Anime `dropped`. */
  num_items_dropped: number;
  /** Anime `plan_to_watch`. */
  num_items_plan_to_watch: number;
  /** Total anime across every status. */
  num_items: number;
  /** Days of watch time across watched episodes (fractional). */
  num_days_watched: number;
  /** Days attributed to the `watching` bucket (fractional). */
  num_days_watching: number;
  /** Days attributed to the `completed` bucket (fractional). */
  num_days_completed: number;
  /** Days attributed to the `on_hold` bucket (fractional). */
  num_days_on_hold: number;
  /** Days attributed to the `dropped` bucket (fractional). */
  num_days_dropped: number;
  /** Total days across every bucket (fractional). */
  num_days: number;
  /** Total episodes watched. */
  num_episodes: number;
  /** Times the viewer rewatched an anime. */
  num_times_rewatched: number;
  /** Mean of the viewer's scores (0–10; 0 when nothing is rated). */
  mean_score: number;
}
