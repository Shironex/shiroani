import { Grid } from 'react-window';
import { useDiscoverGrid } from './DiscoverGrid.hooks';
import { GridCell } from './DiscoverGrid.parts';
import type { IDiscoverGridProps } from './DiscoverGrid.types';

/**
 * Virtualized grid of {@link DiscoverCard} backed by react-window. Replaces
 * the CSS grid that mounted every fetched page at once — infinite scroll made
 * the DOM grow without bound. Pagination is driven by {@link onLoadMore},
 * fired when rendering nears the last row (replacing the IntersectionObserver
 * sentinel, which has no anchor inside a virtualized scroller).
 */
export default function DiscoverGrid(props: IDiscoverGridProps) {
  const {
    containerRef,
    columnCount,
    columnWidth,
    rowCount,
    getRowHeight,
    handleCellsRendered,
    cellProps,
    canRender,
  } = useDiscoverGrid(props);

  return (
    <div ref={containerRef} className="h-full w-full">
      {canRender && (
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
