import { useMemo } from 'react';
import type { AiringAnime } from '@shiroani/shared';

/**
 * Builds a day→entries map for the week grid views.
 *
 * Entries are returned in caller order — sorting (chronological, tracked-first,
 * etc.) is the caller's responsibility. ScheduleView pre-sorts the `schedule`
 * it passes in, so this hook is a pure bucket/identity helper; `schedule` is
 * still a memo dependency so the map recomputes when the filtered/sorted source
 * changes.
 */
export function useWeekData(
  weekDays: string[],
  getEntriesForDay: (day: string) => AiringAnime[],
  schedule: Record<string, AiringAnime[]>
) {
  return useMemo(() => {
    const map = new Map<string, AiringAnime[]>();
    for (const day of weekDays) {
      map.set(day, getEntriesForDay(day));
    }
    return map;
  }, [weekDays, getEntriesForDay, schedule]);
}
