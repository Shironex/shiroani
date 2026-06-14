import { type CellComponentProps } from 'react-window';
import { Loader2 } from 'lucide-react';
import { DiscoverCard } from '@/components/discover/DiscoverCard';
import type { ICellProps } from './DiscoverGrid.types';

// gap-3.5 between cards (mirrors the previous CSS grid `gap-3.5`).
export const GAP_PX = 14;
// DiscoverCard is a single `aspect-[2/3]` cover (title overlay sits on top of
// it), so card height = card width * 3/2 — same geometry as AnimeCard.
export const CARD_ASPECT = 1.5;
// Trailing row: hosts the load-more spinner and doubles as clearance so the
// last cards can scroll out from under the floating navigation dock (mirrors
// the old `pb-24`).
export const LOAD_MORE_ROW_PX = 96;
// Ask for the next page once rendering reaches this many rows from the end —
// the virtualized replacement for the old sentinel's `rootMargin: 200px`.
export const LOAD_AHEAD_ROWS = 2;

/**
 * Column count for a given container width, mirroring the previous Tailwind
 * classes (`grid-cols-2 sm:3 md:4 lg:5 2xl:6`). Tailwind breakpoints are
 * viewport-based; the discover container tracks the viewport closely (minus
 * the sidebar), so container width is used as the proxy — same approximation
 * LibraryGrid makes.
 */
export function columnsForWidth(width: number): number {
  if (width >= 1536) return 6;
  if (width >= 1024) return 5;
  if (width >= 768) return 4;
  if (width >= 640) return 3;
  return 2;
}

export function GridCell({
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
}: CellComponentProps<ICellProps>) {
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
