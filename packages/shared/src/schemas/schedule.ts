/**
 * Zod schemas for schedule backend payloads.
 *
 * Dates are expected in `YYYY-MM-DD` format (what the renderer sends).
 */

import { z } from 'zod';

const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');

export const scheduleGetDailyPayloadSchema = z.object({
  date: dateStringSchema,
});

export const scheduleGetWeeklyPayloadSchema = z.object({
  startDate: dateStringSchema,
});
