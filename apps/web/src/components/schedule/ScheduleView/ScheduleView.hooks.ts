import { useState, useMemo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Rows3, LayoutGrid, Images } from 'lucide-react';
import { toLocalDate } from '@shiroani/shared';
import { useScheduleStore } from '@/stores/useScheduleStore';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { addDays, formatDayHeading, formatWeekRange } from '../schedule-utils';
import type { AiringAnime } from '@shiroani/shared';
import type { IModeDef, IScheduleViewView, ScheduleMode } from './ScheduleView.types';

const {
  selectDay,
  setViewMode,
  getWeekDays,
  fetchDaily,
  fetchWeekly,
  toggleLibraryFilter,
  setSort,
} = useScheduleStore.getState();

export function useScheduleView(): IScheduleViewView {
  const { t } = useTranslation('schedule');
  const MODES = useMemo<IModeDef[]>(
    () => [
      {
        id: 'daily',
        label: t('modes.daily.label'),
        tooltip: t('modes.daily.tooltip'),
        Icon: Rows3,
      },
      {
        id: 'weekly',
        label: t('modes.weekly.label'),
        tooltip: t('modes.weekly.tooltip'),
        Icon: LayoutGrid,
      },
      {
        id: 'timetable',
        label: t('modes.timetable.label'),
        tooltip: t('modes.timetable.tooltip'),
        Icon: Images,
      },
    ],
    [t]
  );
  const [selectedAnime, setSelectedAnime] = useState<AiringAnime | null>(null);
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);

  const handleAnimeClick = useCallback((anime: AiringAnime) => {
    setSelectedAnime(anime);
    setInfoDialogOpen(true);
  }, []);

  const selectedDay = useScheduleStore(s => s.selectedDay);
  const viewMode = useScheduleStore(s => s.viewMode) as ScheduleMode;
  const isLoading = useScheduleStore(s => s.isLoading);
  const error = useScheduleStore(s => s.error);
  const rawSchedule = useScheduleStore(s => s.schedule);
  const onlyInLibrary = useScheduleStore(s => s.onlyInLibrary);
  const sort = useScheduleStore(s => s.sort);

  const navigatePrevious = useCallback(() => {
    selectDay(addDays(selectedDay, viewMode === 'daily' ? -1 : -7));
  }, [viewMode, selectedDay]);

  const navigateNext = useCallback(() => {
    selectDay(addDays(selectedDay, viewMode === 'daily' ? 1 : 7));
  }, [viewMode, selectedDay]);

  const navigateToday = useCallback(() => {
    const today = new Date();
    selectDay(toLocalDate(today));
  }, []);

  // Load notification subscriptions once
  const notifLoaded = useNotificationStore(state => state.loaded);
  const loadSubscriptions = useNotificationStore(state => state.loadSubscriptions);
  useEffect(() => {
    if (!notifLoaded) loadSubscriptions();
  }, [notifLoaded, loadSubscriptions]);

  // Membership sets — used to tint cards (WeeklyView), drive the "tracked
  // today" badge, the library-only filter, and the tracked-first sort. Keyed
  // by AniList id (matches `anime.media.id`). These are reactive store
  // subscriptions, so toggling a subscription re-derives the filtered schedule.
  const subscribedAnilistIds = useNotificationStore(s => s.subscribedIds);
  const libraryEntries = useLibraryStore(s => s.entries);
  const libraryAnilistIds = useMemo(
    () =>
      new Set(
        libraryEntries.map(e => e.anilistId).filter((x): x is number => typeof x === 'number')
      ),
    [libraryEntries]
  );

  // True when the anime is tracked — present in the library OR subscribed for
  // airing notifications. Both the filter and the tracked-first sort key off
  // this single notion of "tracked".
  const isTracked = useCallback(
    (anime: AiringAnime) =>
      libraryAnilistIds.has(anime.media.id) || subscribedAnilistIds.has(anime.media.id),
    [libraryAnilistIds, subscribedAnilistIds]
  );

  // Derived schedule: apply the library-only filter and the chosen sort once,
  // up here, then feed every view (daily / weekly / timetable) the same
  // result. A new object identity is produced whenever the filter, sort, or
  // membership sets change so `useWeekData`'s `schedule` memo key invalidates.
  const schedule = useMemo(() => {
    const next: Record<string, AiringAnime[]> = {};
    for (const [day, entries] of Object.entries(rawSchedule)) {
      const filtered = onlyInLibrary ? entries.filter(isTracked) : entries;
      const sorted = [...filtered].sort((a, b) => {
        if (sort === 'tracked') {
          const at = isTracked(a) ? 0 : 1;
          const bt = isTracked(b) ? 0 : 1;
          if (at !== bt) return at - bt;
        }
        return a.airingAt - b.airingAt;
      });
      next[day] = sorted;
    }
    return next;
  }, [rawSchedule, onlyInLibrary, sort, isTracked]);

  // Read filtered/sorted entries from the derived schedule rather than the
  // store's raw getter, so all three views share one filtered source.
  const getFilteredEntriesForDay = useCallback(
    (day: string): AiringAnime[] => schedule[day] ?? [],
    [schedule]
  );

  const todayEntries = useMemo(
    () => getFilteredEntriesForDay(selectedDay),
    [selectedDay, getFilteredEntriesForDay]
  );

  const weekDays = useMemo(() => getWeekDays(), [selectedDay]);

  // Count of tracked shows airing on the *actual* calendar today (not the
  // selected day) so the badge stays stable as the user navigates. Reads from
  // the raw schedule so the count ignores the library-only filter.
  const trackedTodayCount = useMemo(() => {
    const todayKey = toLocalDate(new Date());
    return (rawSchedule[todayKey] ?? []).filter(isTracked).length;
  }, [rawSchedule, isTracked]);

  // Summary counts for the subtitle line — relies on i18next CLDR plural rules.
  const summary = useMemo(() => {
    if (viewMode === 'daily') {
      const count = todayEntries.length;
      if (count === 0) return t('summary.noAirings');
      return t('summary.episodes', { count });
    }
    let total = 0;
    for (const d of weekDays) total += (schedule[d] ?? []).length;
    if (total === 0) return t('summary.noAirings');
    return t('summary.episodes', { count: total });
  }, [viewMode, todayEntries, weekDays, schedule, t]);

  const handleRetry = useCallback(() => {
    if (viewMode === 'daily') {
      fetchDaily(selectedDay);
    } else {
      const weekStart = weekDays[0] ?? selectedDay;
      fetchWeekly(weekStart);
    }
  }, [viewMode, selectedDay, weekDays]);

  const headingTitle =
    viewMode === 'daily'
      ? formatDayHeading(selectedDay)
      : formatWeekRange(weekDays[0] ?? selectedDay, weekDays[6] ?? selectedDay);

  const previousAria = viewMode === 'daily' ? t('nav.previousDay') : t('nav.previousWeek');
  const nextAria = viewMode === 'daily' ? t('nav.nextDay') : t('nav.nextWeek');

  return {
    selectedDay,
    viewMode,
    isLoading,
    error,
    onlyInLibrary,
    sort,
    summary,
    headingTitle,
    previousAria,
    nextAria,
    trackedTodayCount,
    MODES,
    schedule,
    todayEntries,
    weekDays,
    getFilteredEntriesForDay,
    libraryAnilistIds,
    subscribedAnilistIds,
    selectedAnime,
    infoDialogOpen,
    setInfoDialogOpen,
    handleAnimeClick,
    navigatePrevious,
    navigateNext,
    navigateToday,
    handleRetry,
    setViewMode,
    toggleLibraryFilter,
    setSort,
  };
}
