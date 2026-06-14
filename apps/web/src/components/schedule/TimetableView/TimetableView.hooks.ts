import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { getDayNamesShort } from '@/lib/constants';
import { useWeekData } from '@/hooks/useWeekData';
import { useNowSeconds } from '@/hooks/useNowSeconds';
import type { ITimetableViewProps, ITimetableViewView } from './TimetableView.types';

type UseTimetableViewArgs = Pick<ITimetableViewProps, 'weekDays' | 'getEntriesForDay' | 'schedule'>;

export function useTimetableView({
  weekDays,
  getEntriesForDay,
  schedule,
}: UseTimetableViewArgs): ITimetableViewView {
  const { i18n } = useTranslation('schedule');
  const dayNamesShort = useMemo(() => getDayNamesShort(), [i18n.language]);
  const weekData = useWeekData(weekDays, getEntriesForDay, schedule);
  const now = useNowSeconds(60_000);

  return { dayNamesShort, weekData, now };
}
