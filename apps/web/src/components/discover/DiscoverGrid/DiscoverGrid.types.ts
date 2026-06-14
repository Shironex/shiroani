import type { RefObject } from 'react';
import type { DiscoverMedia } from '@/stores/useDiscoverStore';

export interface IDiscoverGridProps {
  items: DiscoverMedia[];
  libraryIds: Set<number>;
  hasNextPage: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  onCardClick: (media: DiscoverMedia) => void;
  onAddToLibrary: (media: DiscoverMedia) => void;
}

/** Props threaded into every virtualized {@link DiscoverMedia} cell. */
export interface ICellProps {
  items: DiscoverMedia[];
  columnCount: number;
  baseRowCount: number;
  isLoadingMore: boolean;
  libraryIds: Set<number>;
  onCardClick: (media: DiscoverMedia) => void;
  onAddToLibrary: (media: DiscoverMedia) => void;
}

export interface IDiscoverGridView {
  readonly containerRef: RefObject<HTMLDivElement | null>;
  readonly columnCount: number;
  readonly columnWidth: number;
  readonly rowCount: number;
  readonly getRowHeight: (index: number) => number;
  readonly handleCellsRendered: (visibleCells: { rowStopIndex: number }) => void;
  readonly cellProps: ICellProps;
  readonly canRender: boolean;
}
