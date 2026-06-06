/**
 * Zod schemas for anime and library gateway payloads.
 *
 * These mirror the TypeScript types in `../types/anime.ts` and provide runtime
 * validation at the Socket.IO gateway boundary.
 */

import { z } from 'zod';
import {
  DISCOVER_SORTS,
  DISCOVER_FORMATS,
  DISCOVER_STATUSES,
  DISCOVER_SEASONS,
  DISCOVER_MIN_YEAR,
  DISCOVER_SCORE_MIN,
  DISCOVER_SCORE_MAX,
} from '../constants/discover-filters';

/** User-selectable sort mode for the browse tabs (item 2). */
export const discoverSortSchema = z.enum(DISCOVER_SORTS);

/**
 * Advanced browse/search filters (item 6). All optional — shared by the
 * trending/popular/seasonal/search payloads.
 */
export const discoverFiltersSchema = z.object({
  includedGenres: z.array(z.string().min(1).max(50)).max(20).optional(),
  excludedGenres: z.array(z.string().min(1).max(50)).max(20).optional(),
  tags: z.array(z.string().min(1).max(50)).max(20).optional(),
  format: z.enum(DISCOVER_FORMATS).optional(),
  status: z.enum(DISCOVER_STATUSES).optional(),
  year: z.number().int().min(DISCOVER_MIN_YEAR).max(2100).optional(),
  season: z.enum(DISCOVER_SEASONS).optional(),
  scoreMin: z.number().int().min(DISCOVER_SCORE_MIN).max(DISCOVER_SCORE_MAX).optional(),
  scoreMax: z.number().int().min(DISCOVER_SCORE_MIN).max(DISCOVER_SCORE_MAX).optional(),
  excludeOnList: z.boolean().optional(),
});

/** AniList list-entry status (write vocabulary for SaveMediaListEntry). */
export const aniListListStatusSchema = z.enum([
  'CURRENT',
  'PLANNING',
  'COMPLETED',
  'DROPPED',
  'PAUSED',
  'REPEATING',
]);

/** Recommendation vote (AniList RecommendationRating). */
export const recommendationRatingSchema = z.enum(['RATE_UP', 'RATE_DOWN', 'NO_RATING']);

export const animeStatusSchema = z.enum([
  'watching',
  'completed',
  'plan_to_watch',
  'on_hold',
  'dropped',
]);

// ============================================
// Anime gateway payloads
// ============================================

export const animeSearchPayloadSchema = z.object({
  query: z.string().trim().min(1).max(200),
  page: z.number().int().positive().max(500).optional(),
  sort: discoverSortSchema.optional(),
  filters: discoverFiltersSchema.optional(),
});

export const animeGetDetailsPayloadSchema = z.object({
  anilistId: z.number().int().positive(),
});

export const animeGetAiringPayloadSchema = z.object({
  startDate: z.string().refine(s => !isNaN(Date.parse(s)), 'Invalid date'),
  endDate: z.string().refine(s => !isNaN(Date.parse(s)), 'Invalid date'),
  page: z.number().int().positive().max(500).optional(),
});

export const animeGetTrendingPayloadSchema = z.object({
  page: z.number().int().positive().max(500).optional(),
  sort: discoverSortSchema.optional(),
  filters: discoverFiltersSchema.optional(),
});

export const animeGetPopularPayloadSchema = z.object({
  page: z.number().int().positive().max(500).optional(),
  sort: discoverSortSchema.optional(),
  filters: discoverFiltersSchema.optional(),
});

export const animeGetSeasonalPayloadSchema = z.object({
  year: z.number().int().min(1940).max(2100),
  season: z.enum(['WINTER', 'SPRING', 'SUMMER', 'FALL', 'winter', 'spring', 'summer', 'fall']),
  page: z.number().int().positive().max(500).optional(),
  sort: discoverSortSchema.optional(),
  filters: discoverFiltersSchema.optional(),
});

export const animeGetRandomPayloadSchema = z.object({
  includedGenres: z.array(z.string().min(1).max(50)).max(20).optional(),
  excludedGenres: z.array(z.string().min(1).max(50)).max(20).optional(),
  perPage: z.number().int().positive().max(50).optional(),
});

export const animeGetUserProfilePayloadSchema = z.object({
  username: z.string().trim().min(1).max(50),
});

/** Request payload for AnimeEvents.SAVE_MEDIA_LIST_ENTRY (write-through add). */
export const animeSaveMediaListEntryPayloadSchema = z.object({
  mediaId: z.number().int().positive(),
  status: aniListListStatusSchema.optional(),
  progress: z.number().int().nonnegative().max(10_000).optional(),
  /** Local 0–10 score. */
  score: z.number().min(0).max(10).optional(),
  notes: z.string().max(5_000).optional(),
});

/** Request payload for AnimeEvents.GET_RECOMMENDATIONS (community browse). */
export const animeGetRecommendationsPayloadSchema = z
  .object({
    mediaId: z.number().int().positive().optional(),
  })
  .optional();

/** Request payload for AnimeEvents.SAVE_RECOMMENDATION (voting). */
export const animeSaveRecommendationPayloadSchema = z.object({
  mediaId: z.number().int().positive(),
  mediaRecommendationId: z.number().int().positive(),
  rating: recommendationRatingSchema,
});

/**
 * Request payload for AnimeEvents.GET_FOLLOWING / GET_FOLLOWERS. `userId` is
 * optional — when omitted the service resolves the connected viewer's own id.
 */
export const animeGetFollowPayloadSchema = z
  .object({
    userId: z.number().int().positive().optional(),
  })
  .optional();

/** Request payload for AnimeEvents.TOGGLE_FOLLOW (follow/unfollow a user). */
export const animeToggleFollowPayloadSchema = z.object({
  userId: z.number().int().positive(),
});

// ============================================
// Library gateway payloads
// ============================================

export const libraryGetAllPayloadSchema = z
  .object({
    status: animeStatusSchema.optional(),
  })
  .optional();

export const libraryAddPayloadSchema = z.object({
  anilistId: z.number().int().positive().optional(),
  // MyAnimeList id (migration v14) — kept in the validated contract so a MAL
  // import can set it through addEntry rather than having zod strip it.
  malId: z.number().int().positive().nullable().optional(),
  title: z.string().trim().min(1).max(500),
  titleRomaji: z.string().max(500).optional(),
  titleNative: z.string().max(500).optional(),
  coverImage: z.string().url().max(2048).optional(),
  episodes: z.number().int().nonnegative().max(10_000).optional(),
  status: animeStatusSchema.optional(),
  currentEpisode: z.number().int().nonnegative().max(10_000).optional(),
  resumeUrl: z.string().url().max(2048).optional(),
});

export const libraryUpdatePayloadSchema = z.object({
  id: z.number().int().positive(),
  anilistId: z.number().int().positive().nullable().optional(),
  status: animeStatusSchema.optional(),
  currentEpisode: z.number().int().nonnegative().max(10_000).optional(),
  score: z.number().min(0).max(10).optional(),
  notes: z.string().max(5_000).optional(),
  resumeUrl: z.string().url().max(2048).optional(),
});

export const libraryRemovePayloadSchema = z.object({
  id: z.number().int().positive(),
});

// ============================================
// AniList sync gateway payloads
// ============================================

/** Request payload for a single-entry AniList sync (AniListSyncEvents.SYNC_ENTRY). */
export const anilistSyncEntryPayloadSchema = z.object({
  localId: z.number().int().positive(),
  direction: z.enum(['push', 'pull', 'auto']),
});

/**
 * Request payload for a single-entry MAL sync (MalSyncEvents.SYNC_ENTRY).
 *
 * Identical shape to {@link anilistSyncEntryPayloadSchema} (the
 * provider-neutral {@link AniListSyncEntryRequest}) — declared separately so the
 * MAL gateway validates against its own named schema rather than borrowing the
 * AniList one, keeping the two sync surfaces decoupled.
 */
export const malSyncEntryPayloadSchema = z.object({
  localId: z.number().int().positive(),
  direction: z.enum(['push', 'pull', 'auto']),
});
