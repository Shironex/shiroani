import {
  EmptyState,
  HourGutter,
  NoAiringsNow,
  NowIndicator,
  SlotCards,
  TimelineDecorations,
} from './DailyView.parts';
import { useDailyView } from './DailyView.hooks';
import type { IDailyViewProps } from './DailyView.types';

/**
 * Adaptive vertical hour-axis timeline for a single day.
 *
 * Thin shell: `useDailyView` owns all layout math (block list, gutter marks,
 * live-now mapping, auto-scroll); the presentational parts own the per-list
 * iteration. This file only composes them.
 */
export default function DailyView({ entries, day, onAnimeClick }: IDailyViewProps) {
  const { scrollRef, now, blocks, railHeight, hourMarks, nowTop, nowLabel, isToday } = useDailyView(
    {
      entries,
      day,
    }
  );

  // Empty state
  if (entries.length === 0) {
    return <EmptyState />;
  }

  const showNoAiringsNow = isToday && nowTop == null;

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden">
      <div
        className="relative grid"
        style={{
          gridTemplateColumns: '64px 1fr',
          height: `${railHeight}px`,
          paddingBottom: '96px',
        }}
      >
        {/* Hour gutter */}
        <HourGutter hourMarks={hourMarks} />

        {/* Timeline column */}
        <div className="relative pr-7 pl-2">
          {/* Vertical rule */}
          <div aria-hidden="true" className="absolute top-0 bottom-0 left-0 w-px bg-border-glass" />

          {/* Per-block decorations — gridlines on hour blocks, dashed band on gap blocks */}
          <TimelineDecorations blocks={blocks} />

          {/* Live-now indicator */}
          {nowTop != null && <NowIndicator nowTop={nowTop} nowLabel={nowLabel} />}

          {/* Slot cards — linearly stacked inside each content hour's block. */}
          <SlotCards blocks={blocks} now={now} onAnimeClick={onAnimeClick} />

          {/* Legend fallback if nothing is live right now. */}
          {showNoAiringsNow && <NoAiringsNow />}
        </div>
      </div>
    </div>
  );
}

// Re-exported for tests / debugging — legacy name kept stable.
export { HOUR_HEIGHT_BASE as HOUR_HEIGHT } from './DailyView.hooks';
