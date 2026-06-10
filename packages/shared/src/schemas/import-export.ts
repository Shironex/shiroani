/**
 * Zod schemas for import/export gateway payloads.
 *
 * Mirrors:
 *   - `ExportRequest`
 *   - `ImportRequest` / `ShiroaniExportFormat`
 *   - `Omit<AnimeEntry, 'id'>` for the library array
 *   - `Omit<DiaryEntry, 'id' | 'animeId'>` for the diary array
 *
 * The import schema must tolerate data written by previous ShiroAni versions,
 * so timestamps are validated as "parseable date strings" rather than strict
 * ISO 8601 to avoid rejecting otherwise-valid exports.
 */

import { z } from 'zod';

import { animeStatusSchema } from './anime';
import { diaryGradientSchema, diaryMoodSchema } from './diary';

const dateIshStringSchema = z.string().refine(s => !isNaN(Date.parse(s)), 'Invalid date');

// ============================================
// Export
// ============================================

export const exportRequestSchema = z.object({
  type: z.enum(['library', 'diary', 'all']),
  ids: z.array(z.number().int().positive()).max(10_000).optional(),
});

// ============================================
// Import — entry shapes (mirror Omit<AnimeEntry, 'id'>)
// ============================================

// Sync-STATE fields on AnimeEntry (`synced`, `anilistSyncedAt`, `malSynced`,
// `malSyncedAt`) are deliberately absent: baselines describe an agreement with
// a specific remote account on a specific machine, so importing them would
// poison reconciliation on the target. zod strips them silently. The provider
// LINK ids (`anilistId`, `malId`) ARE part of the contract — dropping `malId`
// here once cost every restored backup its MAL links.
const libraryEntryImportSchema = z.object({
  anilistId: z.number().int().positive().optional(),
  malId: z.number().int().positive().nullable().optional(),
  title: z.string().min(1).max(500),
  titleRomaji: z.string().max(500).optional(),
  titleNative: z.string().max(500).optional(),
  coverImage: z.string().url().max(2048).optional(),
  episodes: z.number().int().nonnegative().max(10_000).optional(),
  status: animeStatusSchema,
  currentEpisode: z.number().int().nonnegative().max(10_000),
  score: z.number().min(0).max(10).optional(),
  notes: z.string().max(5_000).optional(),
  resumeUrl: z.string().url().max(2048).optional(),
  addedAt: dateIshStringSchema,
  updatedAt: dateIshStringSchema,
});

// Mirror Omit<DiaryEntry, 'id' | 'animeId'> — `animeId` is stripped on export,
// so we omit it here. `animeTitle` / `animeCoverImage` remain as optional
// context for the diary entry.
const diaryEntryImportSchema = z.object({
  title: z.string().min(1).max(200),
  contentJson: z.string().min(1).max(200_000),
  coverGradient: diaryGradientSchema.optional(),
  mood: diaryMoodSchema.optional(),
  tags: z.array(z.string().min(1).max(40)).max(30).optional(),
  animeTitle: z.string().max(200).optional(),
  animeCoverImage: z.string().url().max(2048).optional(),
  isPinned: z.boolean(),
  createdAt: dateIshStringSchema,
  updatedAt: dateIshStringSchema,
});

// ============================================
// Import — envelope
// ============================================

const shiroaniExportFormatSchema = z.object({
  version: z.literal(1),
  exportedAt: dateIshStringSchema,
  source: z.literal('shiroani'),
  data: z.object({
    library: z.array(libraryEntryImportSchema).max(50_000).optional(),
    diary: z.array(diaryEntryImportSchema).max(50_000).optional(),
  }),
});

export const importRequestSchema = z.object({
  type: z.enum(['library', 'diary', 'all']),
  data: shiroaniExportFormatSchema,
  strategy: z.enum(['skip', 'overwrite']),
});
