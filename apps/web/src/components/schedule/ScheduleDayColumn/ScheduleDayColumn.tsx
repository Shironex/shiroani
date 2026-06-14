import { cn } from '@/lib/utils';
import { DayColumnHeader } from '../DayColumnHeader';
import { isToday } from '../schedule-utils';
import { DayColumnCardList } from './ScheduleDayColumn.parts';
import type { IScheduleDayColumnProps } from './ScheduleDayColumn.types';

/**
 * One day column in the 7-column week grids (WeeklyView + TimetableView).
 *
 * Owns the column shell (today tint, sticky header, scroll list, empty state)
 * and delegates per-card rendering via `renderCard` — callers decide whether
 * that's a `WeekEventCard`, a `PosterCard`, or anything else.
 */
export default function ScheduleDayColumn({
  day,
  label,
  entries,
  now,
  renderCard,
  emptyLabel,
  listClassName = 'space-y-1.5',
  emptyStateClassName = 'py-6',
  emptyIconClassName = 'w-5 h-5',
}: IScheduleDayColumnProps) {
  const isTodayCol = isToday(day);

  return (
    <div className={cn('flex flex-col min-h-0', isTodayCol && 'bg-primary/[0.04]')}>
      <DayColumnHeader day={day} label={label} entryCount={entries.length} />

      <div className={cn('flex-1 overflow-y-auto p-2 pb-20', listClassName)}>
        <DayColumnCardList
          entries={entries}
          now={now}
          renderCard={renderCard}
          emptyLabel={emptyLabel}
          emptyStateClassName={emptyStateClassName}
          emptyIconClassName={emptyIconClassName}
        />
      </div>
    </div>
  );
}
