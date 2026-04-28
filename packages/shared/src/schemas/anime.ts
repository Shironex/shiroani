/**
 * Zod schemas for anime and library gateway payloads.
 *
 * These mirror the TypeScript types in `../types/anime.ts` and provide runtime
 * validation at the Socket.IO gateway boundary.
 */

import { z } from 'zod';

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
});

export const animeSearchByTitlePayloadSchema = z.object({
  title: z.string().trim().min(1).max(200),
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
});

export const animeGetPopularPayloadSchema = z.object({
  page: z.number().int().positive().max(500).optional(),
});

export const animeGetSeasonalPayloadSchema = z.object({
  year: z.number().int().min(1940).max(2100),
  season: z.enum(['WINTER', 'SPRING', 'SUMMER', 'FALL', 'winter', 'spring', 'summer', 'fall']),
  page: z.number().int().positive().max(500).optional(),
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
