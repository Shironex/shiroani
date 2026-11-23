/**
 * Zod schemas for diary backend payloads.
 *
 * Mirrors the TypeScript types in `../types/diary.ts`.
 */

import { z } from 'zod';

export const diaryGradientSchema = z.enum([
  'sakura',
  'twilight',
  'ocean',
  'matcha',
  'amber',
  'coral',
  'mist',
  'lavender',
  'mint',
  'cyber',
  'starlight',
  'peach',
]);

export const diaryMoodSchema = z.enum(['great', 'good', 'neutral', 'bad', 'terrible']);

export const diaryCreatePayloadSchema = z.object({
  title: z.string().trim().min(1).max(200),
  contentJson: z.string().min(1).max(200_000),
  coverGradient: diaryGradientSchema.optional(),
  mood: diaryMoodSchema.optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(30).optional(),
  animeId: z.number().int().positive().optional(),
  animeTitle: z.string().max(200).optional(),
  animeCoverImage: z.string().url().max(2048).optional(),
});

export const diaryUpdatePayloadSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().trim().min(1).max(200).optional(),
  contentJson: z.string().min(1).max(200_000).optional(),
  coverGradient: diaryGradientSchema.nullable().optional(),
  mood: diaryMoodSchema.nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(30).nullable().optional(),
  animeId: z.number().int().positive().nullable().optional(),
  animeTitle: z.string().max(200).nullable().optional(),
  animeCoverImage: z.string().url().max(2048).nullable().optional(),
  isPinned: z.boolean().optional(),
});

export const diaryRemovePayloadSchema = z.object({
  id: z.number().int().positive(),
});
