import { useState, useMemo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Images,
  LayoutGrid,
  Rows3,
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

const { selectDay, setViewMode, getEntriesForDay, getWeekDays, fetchDaily, fetchWeekly } =
  useScheduleStore.getState();

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
  const schedule = useScheduleStore(s => s.schedule);

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

  const todayEntries = useMemo(() => {
    const entries = getEntriesForDay(selectedDay);
    return [...entries].sort((a, b) => a.airingAt - b.airingAt);
  }, [selectedDay, schedule]);

  const weekDays = useMemo(() => getWeekDays(), [selectedDay]);

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

  // Load notification subscriptions once
  const notifLoaded = useNotificationStore(state => state.loaded);
  const loadSubscriptions = useNotificationStore(state => state.loadSubscriptions);
  useEffect(() => {
    if (!notifLoaded) loadSubscriptions();
  }, [notifLoaded, loadSubscriptions]);

  // Membership sets — used by WeeklyView to tint cards for library /
  // subscribed-only shows. Keyed by AniList id (matches `anime.media.id`).
  const subscribedAnilistIds = useNotificationStore(s => s.subscribedIds);
  const libraryEntries = useLibraryStore(s => s.entries);
  const libraryAnilistIds = useMemo(
    () =>
      new Set(
        libraryEntries.map(e => e.anilistId).filter((x): x is number => typeof x === 'number')
      ),
    [libraryEntries]
  );

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
          </>
        }
      />

      {/* ── Sub-header row — currently-visible date range + legend ───── */}
      <div className="shrink-0 flex items-center justify-between gap-4 px-7 py-3 border-b border-border-glass">
        <div
          aria-live="polite"
          className="font-serif text-[14px] font-semibold leading-none text-foreground/90 tabular-nums"
        >
          {headingTitle}
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
              getEntriesForDay={getEntriesForDay}
              schedule={schedule}
              onAnimeClick={handleAnimeClick}
              libraryAnilistIds={libraryAnilistIds}
              subscribedAnilistIds={subscribedAnilistIds}
            />
          ) : (
            <TimetableView
              weekDays={weekDays}
              getEntriesForDay={getEntriesForDay}
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
