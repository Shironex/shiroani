import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { getScrollbarSize } from 'react-window';
import type { IDiscoverGridProps, IDiscoverGridView } from './DiscoverGrid.types';
import {
  CARD_ASPECT,
  GAP_PX,
  LOAD_AHEAD_ROWS,
  LOAD_MORE_ROW_PX,
  columnsForWidth,
} from './DiscoverGrid.parts';

export function useDiscoverGrid({
  items,
  libraryIds,
  hasNextPage,
  isLoadingMore,
  onLoadMore,
  onCardClick,
  onAddToLibrary,
}: IDiscoverGridProps): IDiscoverGridView {
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

  const cellProps = useMemo(
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

  const canRender = containerWidth > 0 && rowHeight > 0;

  return {
    containerRef,
    columnCount,
    columnWidth,
    rowCount,
    getRowHeight,
    handleCellsRendered,
    cellProps,
    canRender,
  };
}
