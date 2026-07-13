import { useTranslation } from 'react-i18next';
import {
  ArrowDownUp,
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ListFilter,
  Star,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { TooltipButton } from '@/components/ui/tooltip-button';
import { KanjiWatermark } from '@/components/shared/KanjiWatermark';
import { ViewHeader } from '@/components/shared/ViewHeader';
import { isToday } from '../schedule-utils';
import { AnimeInfoDialog } from '../AnimeInfoDialog';
import { useScheduleView } from './ScheduleView.hooks';
import { LegendSwatch, ModeSwitcher, ScheduleBody } from './ScheduleView.parts';

export default function ScheduleView() {
  const { t } = useTranslation('schedule');
  const {
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
  } = useScheduleView();

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

            <ModeSwitcher MODES={MODES} viewMode={viewMode} setViewMode={setViewMode} t={t} />

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
          <LegendSwatch className="bg-status-info" label={t('legend.upcoming')} />
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
          <ScheduleBody
            isLoading={isLoading}
            viewMode={viewMode}
            error={error}
            handleRetry={handleRetry}
            todayEntries={todayEntries}
            selectedDay={selectedDay}
            handleAnimeClick={handleAnimeClick}
            weekDays={weekDays}
            getFilteredEntriesForDay={getFilteredEntriesForDay}
            schedule={schedule}
            libraryAnilistIds={libraryAnilistIds}
            subscribedAnilistIds={subscribedAnilistIds}
          />
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
