import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { getDayNamesShort } from '@/lib/constants';
import { useWeekData } from '@/hooks/useWeekData';
import { useNowSeconds } from '@/hooks/useNowSeconds';
import type { AiringAnime } from '@shiroani/shared';
import type { IWeeklyViewView } from './WeeklyView.types';

interface IUseWeeklyViewArgs {
  weekDays: string[];
  getEntriesForDay: (day: string) => AiringAnime[];
  schedule: Record<string, AiringAnime[]>;
}

/**
 * Data logic for the WeeklyView shell: locale-aware short weekday labels, the
 * day→entries map, and the ticking "now" clock. Keeps the shell free of
 * `useMemo` / data-hook plumbing.
 */
export function useWeeklyView({
  weekDays,
  getEntriesForDay,
  schedule,
}: IUseWeeklyViewArgs): IWeeklyViewView {
  const { i18n } = useTranslation('schedule');
  const dayNamesShort = useMemo(() => getDayNamesShort(), [i18n.language]);
  const weekData = useWeekData(weekDays, getEntriesForDay, schedule);
  const now = useNowSeconds(60_000);

  return { dayNamesShort, weekData, now };
}
