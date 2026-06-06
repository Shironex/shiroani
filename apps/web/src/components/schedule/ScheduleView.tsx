import { useState, useMemo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowDownUp,
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Images,
  LayoutGrid,
  ListFilter,
  Rows3,
  Star,
} from 'lucide-react';
import { toLocalDate } from '@shiroani/shared';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { TooltipButton } from '@/components/ui/tooltip-button';
import { KanjiWatermark } from '@/components/shared/KanjiWatermark';
import { ViewHeader } from '@/components/shared/ViewHeader';
import { AniListErrorState } from '@/components/shared/AniListErrorState';
import { useScheduleStore } from '@/stores/useScheduleStore';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { DailyViewSkeleton, WeeklyViewSkeleton, TimetableViewSkeleton } from './ScheduleSkeletons';
import { addDays, formatDayHeading, formatWeekRange, isToday } from './schedule-utils';
import { DailyView } from './DailyView';
import { WeeklyView } from './WeeklyView';
import { TimetableView } from './TimetableView';
import { AnimeInfoDialog } from './AnimeInfoDialog';
import type { AiringAnime } from '@shiroani/shared';

const {
  selectDay,
  setViewMode,
  getWeekDays,
  fetchDaily,
  fetchWeekly,
  toggleLibraryFilter,
  setSort,
} = useScheduleStore.getState();

type ScheduleMode = 'daily' | 'weekly' | 'timetable';

interface ModeDef {
  id: ScheduleMode;
  label: string;
  tooltip: string;
  Icon: typeof Rows3;
}

export function ScheduleView() {
  const { t } = useTranslation('schedule');
  const MODES = useMemo<ModeDef[]>(
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

  return (
    <div className="flex-1 flex flex-col overflow-hidden animate-fade-in relative">
      <ViewHeader
        icon={Calendar}
        title={t('title')}
        subtitle={summary}
        actions={
          <>
            {/* Date nav */}
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8"
              onClick={navigatePrevious}
              aria-label={previousAria}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8"
              onClick={navigateNext}
              aria-label={nextAria}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            {!isToday(selectedDay) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-xs font-medium"
                onClick={navigateToday}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                {t('nav.today')}
              </Button>
            )}

            <div className="w-px h-4 bg-border-glass mx-1" />

            {/* View mode switcher — icon-only tabs with tooltips, kept as
                TooltipButton because FilterTabBar renders its label text. */}
            <div
              role="tablist"
              aria-label={t('modes.ariaLabel')}
              className="flex items-center gap-1"
            >
              {MODES.map(m => {
                const Icon = m.Icon;
                const active = viewMode === m.id;
                return (
                  <TooltipButton
                    key={m.id}
                    role="tab"
                    aria-selected={active}
                    variant={active ? 'secondary' : 'ghost'}
                    size="icon"
                    onClick={() => setViewMode(m.id)}
                    className={cn(
                      'w-8 h-8 transition-colors duration-150',
                      active && 'bg-primary/15 text-primary hover:bg-primary/15'
                    )}
                    tooltip={m.tooltip}
                  >
                    <Icon className="w-4 h-4" />
                  </TooltipButton>
                );
              })}
            </div>

            <div className="w-px h-4 bg-border-glass mx-1" />

            {/* Personalization — library-only filter + tracked-first sort.
                Both are stateful toggles; active = primary tint, matching the
                view-mode switcher. */}
            <TooltipButton
              aria-pressed={onlyInLibrary}
              variant={onlyInLibrary ? 'secondary' : 'ghost'}
              size="icon"
              onClick={toggleLibraryFilter}
              className={cn(
                'w-8 h-8 transition-colors duration-150',
                onlyInLibrary && 'bg-primary/15 text-primary hover:bg-primary/15'
              )}
              tooltip={onlyInLibrary ? t('filter.libraryOnlyActive') : t('filter.libraryOnly')}
            >
              <ListFilter className="w-4 h-4" />
            </TooltipButton>

            <TooltipButton
              aria-pressed={sort === 'tracked'}
              variant={sort === 'tracked' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setSort(sort === 'tracked' ? 'time' : 'tracked')}
              className={cn(
                'w-8 h-8 transition-colors duration-150',
                sort === 'tracked' && 'bg-primary/15 text-primary hover:bg-primary/15'
              )}
              tooltip={sort === 'tracked' ? t('sort.trackedFirstActive') : t('sort.trackedFirst')}
            >
              <ArrowDownUp className="w-4 h-4" />
            </TooltipButton>
          </>
        }
      />

      {/* ── Sub-header row — currently-visible date range + legend ───── */}
      <div className="shrink-0 flex items-center justify-between gap-4 px-7 py-3 border-b border-border-glass">
        <div className="flex items-center gap-3 min-w-0">
          <div
            aria-live="polite"
            className="font-serif text-[14px] font-semibold leading-none text-foreground/90 tabular-nums"
          >
            {headingTitle}
          </div>
          {/* Tracked-today summary — counts shows the user follows airing on the
              actual calendar today, independent of the selected day. */}
          {trackedTodayCount > 0 && (
            <span
              className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-[10.5px] font-medium leading-none text-primary"
              title={t('trackedToday.tooltip')}
            >
              <Star className="w-3 h-3 fill-current" aria-hidden="true" />
              {t('trackedToday.count', { count: trackedTodayCount })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 font-mono text-[10.5px] text-muted-foreground/80">
          <LegendSwatch className="bg-primary" label={t('legend.live')} />
          <LegendSwatch className="bg-[oklch(0.5_0.15_280)]" label={t('legend.upcoming')} />
          <LegendSwatch className="bg-muted-foreground/30" label={t('legend.watched')} />
        </div>
      </div>

      {/* ── Body: kanji watermark in a clipped layer, content on top ─── */}
      <div role="region" aria-label={t('regionLabel')} className="flex-1 relative overflow-hidden">
        {/* Decorative kanji watermark — 時 (toki: time).
            Lives outside any scroll container so the glyph's negative offsets
            don't produce scrollbars on either axis. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <KanjiWatermark kanji="時" position="br" size={300} opacity={0.03} />
        </div>

        <div className="absolute inset-0 flex flex-col">
          {isLoading ? (
            viewMode === 'daily' ? (
              <DailyViewSkeleton />
            ) : viewMode === 'weekly' ? (
              <WeeklyViewSkeleton />
            ) : (
              <TimetableViewSkeleton />
            )
          ) : error ? (
            <AniListErrorState error={error} onRetry={handleRetry} className="flex-1" />
          ) : viewMode === 'daily' ? (
            <DailyView entries={todayEntries} day={selectedDay} onAnimeClick={handleAnimeClick} />
          ) : viewMode === 'weekly' ? (
            <WeeklyView
              weekDays={weekDays}
              getEntriesForDay={getFilteredEntriesForDay}
              schedule={schedule}
              onAnimeClick={handleAnimeClick}
              libraryAnilistIds={libraryAnilistIds}
              subscribedAnilistIds={subscribedAnilistIds}
            />
          ) : (
            <TimetableView
              weekDays={weekDays}
              getEntriesForDay={getFilteredEntriesForDay}
              schedule={schedule}
              onAnimeClick={handleAnimeClick}
            />
          )}
        </div>
      </div>

      <AnimeInfoDialog
        anime={selectedAnime}
        open={infoDialogOpen}
        onOpenChange={setInfoDialogOpen}
      />
    </div>
  );
}

function LegendSwatch({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <i aria-hidden="true" className={cn('block w-2 h-2 rounded-full', className)} />
      {label}
    </span>
  );
}
