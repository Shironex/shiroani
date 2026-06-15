import { cn } from '@/lib/utils';
import { useTimeline } from './Timeline.hooks';
import { TimelineDot } from './Timeline.parts';
import type { ITimelineProps } from './Timeline.types';

/**
 * Timeline — a reusable vertical timeline primitive.
 *
 * Layout: a two-column grid. Left column is a narrow label (timestamp + title),
 * the middle is a 1-px vertical line with colored dots at each entry, and the
 * right column holds arbitrary content.
 *
 * Used by the Changelog view today; the Diary view will extend it later.
 *
 * Keep this component dumb: it only draws the structure. Colors come from
 * tokens (`--border-glass`, `--primary`, `--muted-foreground`) and individual
 * entries may override the dot via the `marker` slot.
 */
export default function Timeline({ entries, className, sideWidth = 76, gap = 48 }: ITimelineProps) {
  useTimeline();

  // The vertical line sits a comfortable 20px right of the label column so
  // the marker's 4px background halo never bleeds into the title text. Must
  // stay smaller than `gap` so the content column still clears the dot.
  const linePosition = sideWidth + 20;
  const contentPadding = sideWidth + gap;

  const sections = entries.map(entry => (
    <section
      key={entry.id}
      id={entry.id}
      className="relative pb-14 last:pb-4"
      style={{ paddingLeft: contentPadding }}
    >
      {/* Left column — timestamp + title */}
      <div
        className="absolute top-[2px] text-right font-mono text-[10.5px] uppercase leading-[1.5] tracking-[0.12em] text-muted-foreground"
        style={{ left: 0, width: sideWidth }}
      >
        {entry.title && (
          <b className="mb-1 block font-sans text-[16px] font-extrabold normal-case tracking-[-0.01em] text-foreground">
            {entry.title}
          </b>
        )}
        {entry.timestamp && <span>{entry.timestamp}</span>}
      </div>

      {/* Marker */}
      <div
        aria-hidden
        className="absolute top-2 z-[1] -translate-x-1/2"
        style={{ left: linePosition }}
      >
        {entry.marker ?? <TimelineDot variant={entry.markerVariant ?? 'outline'} />}
      </div>

      {/* Content */}
      <div>{entry.children}</div>
    </section>
  ));

  return (
    <div
      className={cn('relative', className)}
      style={{
        // Expose line position so child entries line up with it
        ['--timeline-line-x' as string]: `${linePosition}px`,
      }}
    >
      {/* Vertical rail */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 bottom-0 w-px bg-border-glass"
        style={{ left: linePosition }}
      />

      {sections}
    </div>
  );
}
