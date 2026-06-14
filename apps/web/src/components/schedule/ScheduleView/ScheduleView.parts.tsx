import type { TFunction } from 'i18next';
import { cn } from '@/lib/utils';
import { TooltipButton } from '@/components/ui/tooltip-button';
import { AniListErrorState } from '@/components/shared/AniListErrorState';
import { DailyViewSkeleton, WeeklyViewSkeleton, TimetableViewSkeleton } from '../ScheduleSkeletons';
import { DailyView } from '../DailyView';
import { WeeklyView } from '../WeeklyView';
import { TimetableView } from '../TimetableView';
import type { IScheduleViewView } from './ScheduleView.types';

/** A single legend dot + label in the sub-header row. */
export function LegendSwatch({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <i aria-hidden="true" className={cn('block w-2 h-2 rounded-full', className)} />
      {label}
    </span>
  );
}

type ModeSwitcherProps = Pick<IScheduleViewView, 'MODES' | 'viewMode' | 'setViewMode'> & {
  t: TFunction<'schedule'>;
};

/**
 * View-mode switcher — icon-only tabs with tooltips, kept as TooltipButton
 * because FilterTabBar renders its label text.
 */
export function ModeSwitcher({ MODES, viewMode, setViewMode, t }: ModeSwitcherProps) {
  return (
    <div role="tablist" aria-label={t('modes.ariaLabel')} className="flex items-center gap-1">
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
  );
}

type ScheduleBodyProps = Pick<
  IScheduleViewView,
  | 'isLoading'
  | 'viewMode'
  | 'error'
  | 'handleRetry'
  | 'todayEntries'
  | 'selectedDay'
  | 'handleAnimeClick'
  | 'weekDays'
  | 'getFilteredEntriesForDay'
  | 'schedule'
  | 'libraryAnilistIds'
  | 'subscribedAnilistIds'
>;

/** Skeletons while loading, error state, or the active Daily/Weekly/Timetable view. */
export function ScheduleBody({
  isLoading,
  viewMode,
  error,
  handleRetry,
  todayEntries,
  selectedDay,
  handleAnimeClick,
  weekDays,
  getFilteredEntriesForDay,
  schedule,
  libraryAnilistIds,
  subscribedAnilistIds,
}: ScheduleBodyProps) {
  if (isLoading) {
    return viewMode === 'daily' ? (
      <DailyViewSkeleton />
    ) : viewMode === 'weekly' ? (
      <WeeklyViewSkeleton />
    ) : (
      <TimetableViewSkeleton />
    );
  }

  if (error) {
    return <AniListErrorState error={error} onRetry={handleRetry} className="flex-1" />;
  }

  if (viewMode === 'daily') {
    return <DailyView entries={todayEntries} day={selectedDay} onAnimeClick={handleAnimeClick} />;
  }

  if (viewMode === 'weekly') {
    return (
      <WeeklyView
        weekDays={weekDays}
        getEntriesForDay={getFilteredEntriesForDay}
        schedule={schedule}
        onAnimeClick={handleAnimeClick}
        libraryAnilistIds={libraryAnilistIds}
        subscribedAnilistIds={subscribedAnilistIds}
      />
    );
  }

  return (
    <TimetableView
      weekDays={weekDays}
      getEntriesForDay={getFilteredEntriesForDay}
      schedule={schedule}
      onAnimeClick={handleAnimeClick}
    />
  );
}
