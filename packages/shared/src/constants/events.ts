/**
 * WebSocket Socket.io Event Constants
 *
 * Single source of truth for all socket event names used between
 * the frontend (apps/web) and backend (apps/desktop).
 *
 * Naming convention: 'domain:action' (colon separator)
 */

// ============================================
// Anime Events
// ============================================
export const AnimeEvents = {
  // Client -> Server (requests)
  SEARCH: 'anime:search',
  GET_DETAILS: 'anime:get-details',
  GET_AIRING: 'anime:get-airing',

  GET_TRENDING: 'anime:get-trending',
  GET_POPULAR: 'anime:get-popular',
  GET_SEASONAL: 'anime:get-seasonal',
  GET_RANDOM: 'anime:get-random',
  /** Fetch a public AniList profile by username. */
  GET_USER_PROFILE: 'anime:get-user-profile',
  /**
   * Fetch the connected (logged-in) viewer's OWN profile — includes private
   * statistics. No request payload; resolves with `{ profile: UserProfile | null }`
   * (null when not connected). Not cached, so it reflects fresh sync state.
   */
  GET_VIEWER_PROFILE: 'anime:get-viewer-profile',
  /**
   * Fetch the connected viewer's recent AniList activity feed. No request
   * payload; resolves with `{ activities: AniListActivity[] }` ([] when not
   * connected).
   */
  GET_VIEWER_ACTIVITY: 'anime:get-viewer-activity',
  /**
   * Write-through add: create or update the connected viewer's AniList list
   * entry for a media (used by Discover to also push a freshly-added anime to
   * the user's AniList list). Request:
   * `SaveMediaListEntryRequest { mediaId; status?; progress?; score?; notes? }`
   * (status = AniList MediaListStatus, default PLANNING; score is local 0–10).
   * Resolves with `{ updatedAt: number | null }` — the AniList epoch-seconds
   * timestamp the server stamped, or null when not connected. Authed.
   */
  SAVE_MEDIA_LIST_ENTRY: 'anime:save-media-list-entry',
  /**
   * Browse community recommendations (AniList `Page.recommendations`), optionally
   * seeded by a source `mediaId`. Request:
   * `GetRecommendationsRequest { mediaId?: number }`. Resolves with
   * `{ recommendations: AniListCommunityRecommendation[] }`. `userRating` reflects
   * the connected viewer's vote (NO_RATING when unauthed).
   */
  GET_RECOMMENDATIONS: 'anime:get-recommendations',
  /**
   * Vote on a community recommendation (AniList `SaveRecommendation` mutation).
   * Request:
   * `SaveRecommendationRequest { mediaId; mediaRecommendationId; rating }` where
   * rating = 'RATE_UP' | 'RATE_DOWN' | 'NO_RATING'. Resolves with
   * `{ userRating: RecommendationRating | null }` (null when not connected).
   * Authed.
   */
  SAVE_RECOMMENDATION: 'anime:save-recommendation',
  /**
   * Fetch the people the connected viewer (or an explicit `userId`) FOLLOWS.
   * Request: `GetFollowingRequest { userId?: number }` (defaults to the viewer's
   * own id). Resolves with `{ users: AniListUser[] }` ([] when not connected).
   * Authed (viewer id is resolved main-side).
   */
  GET_FOLLOWING: 'anime:get-following',
  /**
   * Fetch the people who FOLLOW the connected viewer (or an explicit `userId`).
   * Request: `GetFollowersRequest { userId?: number }` (defaults to the viewer's
   * own id). Resolves with `{ users: AniListUser[] }` ([] when not connected).
   * Authed.
   */
  GET_FOLLOWERS: 'anime:get-followers',
  /**
   * Follow or unfollow an AniList user (AniList `ToggleFollow` mutation — toggles
   * the current follow state). Request: `ToggleFollowRequest { userId }`. Resolves
   * with `{ isFollowing: boolean | null }` — the NEW follow state, or null when
   * not connected (so the caller can no-op rather than surface an auth error).
   * Authed.
   */
  TOGGLE_FOLLOW: 'anime:toggle-follow',
  /**
   * Fetch the social activity feed of the people the connected viewer FOLLOWS
   * (AniList `activities(isFollowing: true)`, newest first — list + text). No
   * request payload; resolves with `{ activities: AniListActivity[] }` ([] when
   * not connected). Each activity carries an optional `user` (the author), unlike
   * the own-activity feed. Authed.
   */
  GET_SOCIAL_FEED: 'anime:get-social-feed',
  /**
   * Fetch the connected viewer's AniList notifications (airing, following,
   * activity like/reply/mention, related-media), newest first, plus the unread
   * count. No request payload; resolves with
   * `{ notifications: AniListNotification[]; unreadCount: number }` (`{ [], 0 }`
   * when not connected). Does NOT reset the unread count (read-only). Authed.
   */
  GET_NOTIFICATIONS: 'anime:get-notifications',
  /**
   * Clear the connected viewer's unread notification count (AniList
   * `notifications(resetNotificationCount: true)`). No request payload; resolves
   * with `{ unreadCount: 0 }` (also `0` when not connected — a no-op). Authed.
   */
  MARK_NOTIFICATIONS_READ: 'anime:mark-notifications-read',
} as const;

// ============================================
// MyAnimeList Events
// ============================================
/**
 * MyAnimeList read events (distinct from {@link MalSyncEvents}, which run the
 * two-way library sync). The access token never crosses this boundary — the
 * request is authed entirely in the desktop main process.
 */
export const MalEvents = {
  /**
   * Fetch the connected MAL viewer's THIN profile — the {@link MalViewer}
   * identity plus the 15-scalar `anime_statistics`. No request payload; resolves
   * with `{ profile: MalUserStats | null }` (null when no MAL account is
   * connected). NOT AniList-parity: no breakdowns/favourites, `@me` only.
   */
  GET_VIEWER_PROFILE: 'mal:get-viewer-profile',
} as const;

// ============================================
// Library Events
// ============================================
export const LibraryEvents = {
  // Client -> Server (requests)
  GET_ALL: 'library:get-all',
  GET_STATS: 'library:get-stats',
  ADD: 'library:add',
  UPDATE: 'library:update',
  REMOVE: 'library:remove',
  /**
   * Apply the SAME field update to many entries in ONE request. Replaces the N
   * individual UPDATE emits the batch action bar used to fire — those tripped
   * the {@link SystemEvents.THROTTLED} guard on a large selection. Payload:
   * `LibraryUpdateManyPayload { ids; ...updates }`. Resolves with the updated
   * `{ entries }`.
   */
  UPDATE_MANY: 'library:update-many',
  /**
   * Remove many entries in ONE request (one DB transaction). The bulk twin of
   * {@link LibraryEvents.REMOVE}; same throttler-avoidance rationale as
   * {@link LibraryEvents.UPDATE_MANY}. Payload: `LibraryRemoveManyPayload { ids }`.
   * Resolves with `{ ids }` — the ids actually deleted (rows that existed).
   */
  REMOVE_MANY: 'library:remove-many',

  // Server -> Client (broadcasts)
  UPDATED: 'library:updated',
} as const;

// ============================================
// Schedule Events
// ============================================
export const ScheduleEvents = {
  // Client -> Server (requests)
  GET_DAILY: 'schedule:get-daily',
  GET_WEEKLY: 'schedule:get-weekly',

  // Server -> Client (broadcasts)
  DAILY_RESULT: 'schedule:daily-result',
  WEEKLY_RESULT: 'schedule:weekly-result',
} as const;

// ============================================
// Diary Events
// ============================================
export const DiaryEvents = {
  // Client -> Server (requests)
  GET_ALL: 'diary:get-all',
  CREATE: 'diary:create',
  UPDATE: 'diary:update',
  REMOVE: 'diary:remove',

  // Server -> Client (broadcasts)
  UPDATED: 'diary:updated',
} as const;

// ============================================
// Import/Export Events
// ============================================
export const ImportExportEvents = {
  // Client -> Server (requests)
  EXPORT: 'data:export',
  IMPORT: 'data:import',
  /** Factory reset: wipe every user table from the database. */
  CLEAR_ALL: 'data:clear-all',

  // Server -> Client (broadcasts)
  IMPORT_PROGRESS: 'data:import-progress',
} as const;

// ============================================
// AniList Sync Events
// ============================================
/**
 * Two-way AniList library sync. Triggered manually from the Accounts settings.
 * The access token never crosses this boundary — the sync runs entirely in the
 * desktop main process (authenticated via the safeStorage-backed token store).
 */
export const AniListSyncEvents = {
  // Client -> Server (request): run a full two-way sync. Resolves with an
  // AniListSyncResult ack once the run completes.
  SYNC: 'anilist-sync:run',

  // Client -> Server (request): sync a SINGLE library entry by local id, with a
  // forced direction ('push' = local->remote, 'pull' = remote->local) or 'auto'
  // (run the same merge decision a full sync would). Resolves with
  // `{ action: AniListSyncAction }`. Rejects with SYNC_IN_PROGRESS_ERROR if a
  // full sync is currently running (shares the single-flight guard).
  SYNC_ENTRY: 'anilist-sync:run-entry',

  // Server -> Client (broadcast): per-entry progress during a run.
  PROGRESS: 'anilist-sync:progress',
} as const;

// ============================================
// MyAnimeList Sync Events
// ============================================
/**
 * Two-way MyAnimeList library sync. The MAL twin of {@link AniListSyncEvents},
 * with an INDEPENDENT single-flight guard main-side: a MAL sync and an AniList
 * sync can run concurrently (the two providers don't share a `running` flag).
 * The access token never crosses this boundary — the sync runs entirely in the
 * desktop main process (authenticated via the safeStorage-backed MAL token
 * store). The progress + result payloads reuse the provider-neutral
 * {@link SyncProgress} / {@link SyncResult} shapes.
 */
export const MalSyncEvents = {
  // Client -> Server (request): run a full two-way MAL sync. Resolves with an
  // AniListSyncResult ack once the run completes.
  SYNC: 'mal-sync:run',

  // Client -> Server (request): sync a SINGLE library entry by local id, with a
  // forced direction ('push' = local->remote, 'pull' = remote->local) or 'auto'.
  // Resolves with `{ action: AniListSyncAction }`. Rejects with the MAL
  // SYNC_IN_PROGRESS error if a MAL sync is currently running (its own
  // single-flight guard, distinct from AniList's).
  SYNC_ENTRY: 'mal-sync:run-entry',

  // Server -> Client (broadcast): per-entry progress during a MAL run.
  PROGRESS: 'mal-sync:progress',
} as const;

// ============================================
// Feed Events
// ============================================
export const FeedEvents = {
  // Client -> Server (requests)
  GET_ITEMS: 'feed:get-items',
  GET_SOURCES: 'feed:get-sources',
  TOGGLE_SOURCE: 'feed:toggle-source',
  REFRESH: 'feed:refresh',
  /** On-demand full-article extraction for teaser-only feeds. */
  GET_ARTICLE: 'feed:get-article',
  /** Mark one or more feed items as read (durable in the feed DB). */
  MARK_READ: 'feed:mark-read',
  /** Fetch the ids of all feed items marked read, to rehydrate the client on startup. */
  GET_READ_IDS: 'feed:get-read-ids',
  /** Persist the newtab greeting's "last visited the feed" timestamp (durable). */
  SET_LAST_VISITED: 'feed:set-last-visited',
  /** Read the persisted "last visited the feed" timestamp on startup. */
  GET_LAST_VISITED: 'feed:get-last-visited',

  // Server -> Client (broadcasts)
  SOURCES_RESULT: 'feed:sources-result',
  NEW_ITEMS: 'feed:new-items',
} as const;

// ============================================
// System Events
// ============================================
export const SystemEvents = {
  CONNECTED: 'system:connected',
  ERROR: 'system:error',
  THROTTLED: 'system:throttled',
} as const;

// ============================================
// CRUD broadcast actions
// ============================================
/**
 * The `action` discriminator carried by `*:updated` broadcasts so the client
 * knows how to reconcile its list. Single source of truth shared by the
 * library/diary gateways (producers) and {@link createCrudResource} (consumer)
 * to prevent the `'added'` vs `'created'` drift from re-appearing.
 */
export const CrudActions = {
  /** A library entry was created (library uses `added`). */
  ADDED: 'added',
  /** A diary entry was created (diary uses `created`). */
  CREATED: 'created',
  UPDATED: 'updated',
  REMOVED: 'removed',
  /**
   * Many entries were updated in one batch — broadcast carries `{ entries }`
   * (the authoritative rows). Consumers with a batch listener patch them in
   * place; consumers without one fall back to a full re-fetch.
   */
  UPDATED_MANY: 'updated-many',
  /**
   * Many entries were removed in one batch — broadcast carries `{ ids }` (the
   * rows actually deleted). Same consumer contract as {@link UPDATED_MANY}.
   */
  REMOVED_MANY: 'removed-many',
  /** A bulk import landed — consumers re-fetch the whole collection. */
  IMPORTED: 'imported',
} as const;

export type CrudAction = (typeof CrudActions)[keyof typeof CrudActions];
