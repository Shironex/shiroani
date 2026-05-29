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
  year: z
    .number()
    .int()
    .min(DISCOVER_MIN_YEAR)
    .max(2100)
    .optional(),
  season: z.enum(DISCOVER_SEASONS).optional(),
  scoreMin: z.number().int().min(DISCOVER_SCORE_MIN).max(DISCOVER_SCORE_MAX).optional(),
  scoreMax: z.number().int().min(DISCOVER_SCORE_MIN).max(DISCOVER_SCORE_MAX).optional(),
});

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
