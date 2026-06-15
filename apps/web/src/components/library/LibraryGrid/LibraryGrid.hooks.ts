import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { getScrollbarSize } from 'react-window';
import type { ICellProps, ILibraryGridProps, ILibraryGridView } from './LibraryGrid.types';

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

export function useLibraryGrid({
  entries,
  nextAiringMap,
  onSelect,
  onContinue,
  onRemove,
}: ILibraryGridProps): ILibraryGridView {
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

  const cellProps = useMemo<ICellProps>(
    () => ({ entries, columnCount, gap, nextAiringMap, onSelect, onContinue, onRemove }),
    [entries, columnCount, gap, nextAiringMap, onSelect, onContinue, onRemove]
  );

  return {
    containerRef,
    columnCount,
    columnWidth,
    rowCount,
    rowHeight,
    containerWidth,
    canRender: columnCount > 0 && containerWidth > 0 && rowHeight > 0,
    getRowHeight,
    cellProps,
  };
}
