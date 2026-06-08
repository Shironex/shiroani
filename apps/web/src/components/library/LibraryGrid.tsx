import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Grid, getScrollbarSize, type CellComponentProps } from 'react-window';
import { AnimeCard } from '@/components/library/AnimeCard';
import type { AnimeEntry } from '@shiroani/shared';

type NextAiring = { airingAt: number; episode: number };

// gap-3.5 between cards (mirrors the previous CSS grid `gap-3.5`).
const GAP_PX = 14;
// Tailwind `minmax(130px,1fr)` → `xl:minmax(140px,1fr)`. The xl breakpoint is
// viewport-based; the library container tracks the viewport closely (minus the
// sidebar), so using container width as the proxy keeps column counts equivalent.
const MIN_COL_PX = 130;
const MIN_COL_PX_XL = 140;
const XL_BREAKPOINT_PX = 1280;
// AnimeCard is a single `aspect-[2/3]` cover (title/progress overlay sits on top
// of it), so card height = card width * 3/2.
const CARD_ASPECT = 1.5;
// Trailing empty row so the last cards can clear the floating navigation dock at
// the end of the scroll (mirrors the old `pb-24`). The scroller stays full-bleed
// otherwise, so content scrolls *under* the dock rather than leaving a gap.
const DOCK_CLEARANCE_PX = 96;

interface CellProps {
  entries: AnimeEntry[];
  columnCount: number;
  gap: number;
  nextAiringMap: Map<number, NextAiring>;
  onSelect: (entry: AnimeEntry) => void;
  onContinue: (entry: AnimeEntry) => void;
  onRemove: (entry: AnimeEntry) => void;
}

function GridCell({
  columnIndex,
  rowIndex,
  style,
  entries,
  columnCount,
  gap,
  nextAiringMap,
  onSelect,
  onContinue,
  onRemove,
}: CellComponentProps<CellProps>) {
  const index = rowIndex * columnCount + columnIndex;
  const entry = entries[index];
  const halfGap = gap / 2;
  // Symmetric half-gap inset on every edge → uniform card width and height
  // across the row (no edge/middle raggedness), with a `gap`-sized space between
  // neighbours. Outermost cards gain a 7px inset from the container edge, which
  // is imperceptible against the surrounding `px-7`.
  const insetStyle: React.CSSProperties = {
    ...style,
    paddingLeft: halfGap,
    paddingRight: halfGap,
    paddingTop: halfGap,
    paddingBottom: halfGap,
  };
  if (!entry) {
    return <div style={insetStyle} aria-hidden="true" />;
  }
  return (
    <div style={insetStyle}>
      <AnimeCard
        entry={entry}
        nextAiring={entry.anilistId ? (nextAiringMap.get(entry.anilistId) ?? null) : null}
        onSelect={onSelect}
        onContinue={onContinue}
        onRemove={onRemove}
      />
    </div>
  );
}

interface LibraryGridProps {
  entries: AnimeEntry[];
  nextAiringMap: Map<number, NextAiring>;
  onSelect: (entry: AnimeEntry) => void;
  onContinue: (entry: AnimeEntry) => void;
  onRemove: (entry: AnimeEntry) => void;
}

/**
 * Virtualized grid of {@link AnimeCard} backed by react-window. Replaces the
 * previous CSS auto-fill grid that mounted every entry at once — the source of
 * the lag once MAL + AniList sync produced large libraries. Column count is
 * derived from the measured container width to mirror the old
 * `repeat(auto-fill, minmax(130px,1fr))` behaviour.
 */
export function LibraryGrid({
  entries,
  nextAiringMap,
  onSelect,
  onContinue,
  onRemove,
}: LibraryGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setContainerWidth(el.clientWidth);
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(observed => {
      for (const entry of observed) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const gap = GAP_PX;
  const minCol = containerWidth >= XL_BREAKPOINT_PX ? MIN_COL_PX_XL : MIN_COL_PX;

  // CSS auto-fill column count: floor((width + gap) / (minCol + gap)), min 1.
  const columnCount = useMemo(() => {
    if (containerWidth <= 0) return 1;
    return Math.max(1, Math.floor((containerWidth + gap) / (minCol + gap)));
  }, [containerWidth, gap, minCol]);

  // Subtract the scrollbar gutter so the rightmost column doesn't render behind
  // the scrollbar (returns 0 on overlay-scrollbar platforms).
  const scrollbarSize = getScrollbarSize();
  const columnWidth =
    columnCount > 0 ? Math.max(0, containerWidth - scrollbarSize) / columnCount : 0;
  const cardWidth = Math.max(0, columnWidth - gap);
  const rowHeight = cardWidth * CARD_ASPECT + gap;
  const baseRowCount = columnCount > 0 ? Math.ceil(entries.length / columnCount) : 0;
  // One extra row of dock-clearance height, appended after the cards.
  const rowCount = baseRowCount + 1;
  const getRowHeight = useCallback(
    (index: number) => (index >= baseRowCount ? DOCK_CLEARANCE_PX : rowHeight),
    [baseRowCount, rowHeight]
  );

  const cellProps = useMemo<CellProps>(
    () => ({ entries, columnCount, gap, nextAiringMap, onSelect, onContinue, onRemove }),
    [entries, columnCount, gap, nextAiringMap, onSelect, onContinue, onRemove]
  );

  return (
    <div ref={containerRef} className="h-full w-full">
      {columnCount > 0 && containerWidth > 0 && rowHeight > 0 && (
        <Grid
          cellComponent={GridCell}
          cellProps={cellProps}
          columnCount={columnCount}
          columnWidth={columnWidth}
          rowCount={rowCount}
          rowHeight={getRowHeight}
          overscanCount={2}
          className="scrollbar-thin"
          style={{ height: '100%' }}
        />
      )}
    </div>
  );
}
