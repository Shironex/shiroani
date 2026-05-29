/**
 * Zod schemas for feed gateway payloads.
 *
 * Mirrors the TypeScript types in `../types/feed.ts`. Note that the payload
 * `category` and `language` can include `'all'` (a filter value that isn't
 * present on the base `FeedCategory` / `FeedLanguage` unions).
 */

import { z } from 'zod';

export const feedCategorySchema = z.enum(['news', 'episodes', 'reviews', 'community', 'all']);

export const feedLanguageSchema = z.enum(['en', 'pl', 'all']);

export const feedGetItemsPayloadSchema = z.object({
  category: feedCategorySchema.optional(),
  language: feedLanguageSchema.optional(),
  sourceId: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(200).optional(),
  offset: z.number().int().nonnegative().max(100_000).optional(),
});

export const feedToggleSourcePayloadSchema = z.object({
  id: z.number().int().positive(),
  enabled: z.boolean(),
});

export const feedGetArticlePayloadSchema = z.object({
  url: z.string().url().max(2048),
});

export const feedMarkReadPayloadSchema = z.object({
  // Cap the batch so a malformed client can't issue an unbounded UPDATE loop.
  ids: z.array(z.number().int().positive()).max(5000),
});

export const feedSetLastVisitedPayloadSchema = z.object({
  lastVisitedAt: z.number().int().nonnegative(),
});
