import { Grid } from 'react-window';
import { useLibraryGrid } from './LibraryGrid.hooks';
import { GridCell } from './LibraryGrid.parts';
import type { ILibraryGridProps } from './LibraryGrid.types';

/**
 * Virtualized grid of {@link AnimeCard} backed by react-window. Replaces the
 * previous CSS auto-fill grid that mounted every entry at once — the source of
 * the lag once MAL + AniList sync produced large libraries. Column count is
 * derived from the measured container width to mirror the old
 * `repeat(auto-fill, minmax(130px,1fr))` behaviour.
 */
export default function LibraryGrid(props: ILibraryGridProps) {
  const { containerRef, columnCount, columnWidth, rowCount, canRender, getRowHeight, cellProps } =
    useLibraryGrid(props);

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
          style={{ height: '100%' }}
        />
      )}
    </div>
  );
}
