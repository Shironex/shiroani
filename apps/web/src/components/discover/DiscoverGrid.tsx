import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Grid, getScrollbarSize, type CellComponentProps } from 'react-window';
import { Loader2 } from 'lucide-react';
import { DiscoverCard } from '@/components/discover/DiscoverCard';
import type { DiscoverMedia } from '@/stores/useDiscoverStore';

// gap-3.5 between cards (mirrors the previous CSS grid `gap-3.5`).
const GAP_PX = 14;
// DiscoverCard is a single `aspect-[2/3]` cover (title overlay sits on top of
// it), so card height = card width * 3/2 — same geometry as AnimeCard.
const CARD_ASPECT = 1.5;
// Trailing row: hosts the load-more spinner and doubles as clearance so the
// last cards can scroll out from under the floating navigation dock (mirrors
// the old `pb-24`).
const LOAD_MORE_ROW_PX = 96;
// Ask for the next page once rendering reaches this many rows from the end —
// the virtualized replacement for the old sentinel's `rootMargin: 200px`.
const LOAD_AHEAD_ROWS = 2;

/**
 * Column count for a given container width, mirroring the previous Tailwind
 * classes (`grid-cols-2 sm:3 md:4 lg:5 2xl:6`). Tailwind breakpoints are
 * viewport-based; the discover container tracks the viewport closely (minus
 * the sidebar), so container width is used as the proxy — same approximation
 * LibraryGrid makes.
 */
function columnsForWidth(width: number): number {
  if (width >= 1536) return 6;
  if (width >= 1024) return 5;
  if (width >= 768) return 4;
  if (width >= 640) return 3;
  return 2;
}

interface CellProps {
  items: DiscoverMedia[];
  columnCount: number;
  baseRowCount: number;
  isLoadingMore: boolean;
  libraryIds: Set<number>;
  onCardClick: (media: DiscoverMedia) => void;
  onAddToLibrary: (media: DiscoverMedia) => void;
}

function GridCell({
  columnIndex,
  rowIndex,
  style,
  items,
  columnCount,
  baseRowCount,
  isLoadingMore,
  libraryIds,
  onCardClick,
  onAddToLibrary,
}: CellComponentProps<CellProps>) {
  // Trailing row: full-width load-more spinner / dock clearance. Cells are
  // absolutely positioned from the left edge, so widening cell 0 to 100%
  // spans the row; the remaining cells stay empty.
  if (rowIndex >= baseRowCount) {
    if (columnIndex !== 0) {
      return <div style={style} aria-hidden="true" />;
    }
    return (
      <div style={{ ...style, width: '100%' }} className="flex items-start justify-center pt-6">
        {isLoadingMore && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
      </div>
    );
  }

  const index = rowIndex * columnCount + columnIndex;
  const media = items[index];
  const halfGap = GAP_PX / 2;
  // Symmetric half-gap inset on every edge → uniform card size across the row
  // with a `gap`-sized space between neighbours (same scheme as LibraryGrid).
  const insetStyle: React.CSSProperties = {
    ...style,
    paddingLeft: halfGap,
    paddingRight: halfGap,
    paddingTop: halfGap,
    paddingBottom: halfGap,
  };
  if (!media) {
    return <div style={insetStyle} aria-hidden="true" />;
  }
  return (
    <div style={insetStyle}>
      <DiscoverCard
        media={media}
        inLibrary={libraryIds.has(media.id)}
        onClick={onCardClick}
        onAddToLibrary={onAddToLibrary}
      />
    </div>
  );
}

interface DiscoverGridProps {
  items: DiscoverMedia[];
  libraryIds: Set<number>;
  hasNextPage: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  onCardClick: (media: DiscoverMedia) => void;
  onAddToLibrary: (media: DiscoverMedia) => void;
}

/**
 * Virtualized grid of {@link DiscoverCard} backed by react-window. Replaces
 * the CSS grid that mounted every fetched page at once — infinite scroll made
 * the DOM grow without bound. Pagination is driven by {@link onLoadMore},
 * fired when rendering nears the last row (replacing the IntersectionObserver
 * sentinel, which has no anchor inside a virtualized scroller).
 */
export function DiscoverGrid({
  items,
  libraryIds,
  hasNextPage,
  isLoadingMore,
  onLoadMore,
  onCardClick,
  onAddToLibrary,
}: DiscoverGridProps) {
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

  const columnCount = columnsForWidth(containerWidth);

  // Subtract the scrollbar gutter so the rightmost column doesn't render
  // behind the scrollbar (returns 0 on overlay-scrollbar platforms).
  const scrollbarSize = getScrollbarSize();
  const columnWidth = Math.max(0, containerWidth - scrollbarSize) / columnCount;
  const cardWidth = Math.max(0, columnWidth - GAP_PX);
  const rowHeight = cardWidth * CARD_ASPECT + GAP_PX;
  const baseRowCount = Math.ceil(items.length / columnCount);
  // One extra spinner/clearance row, appended after the cards.
  const rowCount = baseRowCount + 1;
  const getRowHeight = useCallback(
    (index: number) => (index >= baseRowCount ? LOAD_MORE_ROW_PX : rowHeight),
    [baseRowCount, rowHeight]
  );

  const handleCellsRendered = useCallback(
    (visibleCells: { rowStopIndex: number }) => {
      if (!hasNextPage || isLoadingMore) return;
      if (visibleCells.rowStopIndex >= baseRowCount - 1 - LOAD_AHEAD_ROWS) {
        onLoadMore();
      }
    },
    [hasNextPage, isLoadingMore, baseRowCount, onLoadMore]
  );

  const cellProps = useMemo<CellProps>(
    () => ({
      items,
      columnCount,
      baseRowCount,
      isLoadingMore,
      libraryIds,
      onCardClick,
      onAddToLibrary,
    }),
    [items, columnCount, baseRowCount, isLoadingMore, libraryIds, onCardClick, onAddToLibrary]
  );

  return (
    <div ref={containerRef} className="h-full w-full">
      {containerWidth > 0 && rowHeight > 0 && (
        <Grid
          cellComponent={GridCell}
          cellProps={cellProps}
          columnCount={columnCount}
          columnWidth={columnWidth}
          rowCount={rowCount}
          rowHeight={getRowHeight}
          overscanCount={2}
          onCellsRendered={handleCellsRendered}
          className="scrollbar-thin"
          style={{ height: '100%' }}
        />
      )}
    </div>
  );
}
