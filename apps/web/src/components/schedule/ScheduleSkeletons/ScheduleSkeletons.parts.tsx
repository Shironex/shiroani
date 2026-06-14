import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import type { IWeekGridSkeletonProps } from './ScheduleSkeletons.types';

/**
 * Skeleton placeholders only need a stable key per column — strings are not
 * rendered, just used for React's reconciliation. Hard-coded weekday tokens
 * keep the file independent of i18n; if/when these become user-visible the
 * caller should switch to `getDayNamesShort()` + a `useTranslation` hook.
 */
const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

/** Varied title widths for natural-looking skeletons */
const TITLE_WIDTHS = ['w-[70%]', 'w-[55%]', 'w-[80%]', 'w-[62%]', 'w-[75%]', 'w-[48%]'];

/** Number of skeleton cards per column */
const WEEKLY_COUNTS = [3, 4, 2, 4, 3, 2, 3];
const TIMETABLE_COUNTS = [2, 3, 2, 3, 2, 1, 2];

/**
 * 7-column week-grid skeleton shell shared by WeeklyViewSkeleton and
 * TimetableViewSkeleton. Owns the outer scroll box, the grid, the sticky
 * day-header placeholders, and the inner list wrapper — callers only render
 * the actual card shape.
 */
function WeekGridSkeleton({ counts, listClassName, renderCard }: IWeekGridSkeletonProps) {
  return (
    <div aria-busy="true" className="flex-1 overflow-x-auto overflow-y-hidden">
      <div className="grid h-full min-w-[1100px] grid-cols-7 divide-x divide-border-glass">
        {DAY_KEYS.map((dayKey, colIdx) => (
          <div key={dayKey} className="flex flex-col min-h-0">
            {/* Day header */}
            <div className="sticky top-0 z-10 shrink-0 px-3 py-3 text-center border-b border-border-glass bg-card/20 backdrop-blur-sm">
              <Skeleton className="h-2.5 w-8 mx-auto rounded" />
              <Skeleton className="h-6 w-8 mx-auto mt-1.5 rounded" />
              <Skeleton className="h-2 w-6 mx-auto mt-1.5 rounded" />
            </div>

            {/* Day entries */}
            <div className={cn('flex-1 overflow-hidden p-2', listClassName)}>
              {Array.from({ length: counts[colIdx] }).map((_, entryIdx) =>
                renderCard(colIdx, entryIdx)
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────── Daily View ─────────────────────────── */

/**
 * Skeleton for the day timeline — a left hour-gutter plus a stack of
 * slot-shaped placeholders along the timeline column.
 */
export function DailyViewSkeleton() {
  return (
    <div aria-busy="true" className="flex-1 overflow-y-auto">
      <div className="relative grid pb-24" style={{ gridTemplateColumns: '64px 1fr' }}>
        <div className="relative pr-2 pl-7 pt-3 space-y-9">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-2.5 w-10 rounded" />
          ))}
        </div>
        <div className="relative pr-7 pl-2 pt-3 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'flex items-stretch gap-3 rounded-[10px] overflow-hidden',
                'bg-card/40 border border-border-glass'
              )}
              style={{ animationDelay: `${i * 100}ms`, height: '54px' }}
            >
              <Skeleton className="w-[6px] h-full rounded-none" />
              <div className="flex flex-col justify-center gap-1 py-2 min-w-[60px]">
                <Skeleton className="h-3 w-10 rounded" />
                <Skeleton className="h-2 w-6 rounded" />
              </div>
              <Skeleton className="w-[42px] h-[56px] my-auto rounded-md shrink-0" />
              <div className="flex-1 min-w-0 py-2 pr-3 space-y-1.5">
                <Skeleton className={cn('h-3 rounded', TITLE_WIDTHS[i % TITLE_WIDTHS.length])} />
                <Skeleton className="h-2.5 w-[55%] rounded" />
              </div>
              <div className="flex items-center gap-2 pr-3 shrink-0">
                <Skeleton className="h-4 w-12 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── Weekly View ─────────────────────────── */

export function WeeklyViewSkeleton() {
  return (
    <WeekGridSkeleton
      counts={WEEKLY_COUNTS}
      listClassName="space-y-1.5"
      renderCard={(colIdx, entryIdx) => {
        const globalIdx = colIdx * 4 + entryIdx;
        return (
          <div
            key={entryIdx}
            className={cn(
              'rounded-lg border border-l-[3px] border-border-glass border-l-muted-foreground/30',
              'bg-card/40 px-2.5 py-2 space-y-1.5'
            )}
            style={{ animationDelay: `${colIdx * 80 + entryIdx * 60}ms` }}
          >
            <Skeleton className="h-2.5 w-10 rounded" />
            <Skeleton
              className={cn('h-3 rounded', TITLE_WIDTHS[globalIdx % TITLE_WIDTHS.length])}
            />
            <Skeleton className="h-2 w-[40%] rounded" />
          </div>
        );
      }}
    />
  );
}

/* ─────────────────────────── Timetable (Poster) View ─────────────────────────── */

export function TimetableViewSkeleton() {
  return (
    <WeekGridSkeleton
      counts={TIMETABLE_COUNTS}
      listClassName="space-y-2"
      renderCard={(colIdx, entryIdx) => (
        <Skeleton
          key={entryIdx}
          className="w-full rounded-[9px]"
          style={{
            aspectRatio: '2 / 2.6',
            animationDelay: `${colIdx * 100 + entryIdx * 70}ms`,
          }}
        />
      )}
    />
  );
}
