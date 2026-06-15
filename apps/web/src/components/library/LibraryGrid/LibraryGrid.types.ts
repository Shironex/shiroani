import type { RefObject } from 'react';
import type { AnimeEntry } from '@shiroani/shared';

export type NextAiring = { airingAt: number; episode: number };

export interface ILibraryGridProps {
  entries: AnimeEntry[];
  nextAiringMap: Map<number, NextAiring>;
  onSelect: (entry: AnimeEntry) => void;
  onContinue: (entry: AnimeEntry) => void;
  onRemove: (entry: AnimeEntry) => void;
}

/** Props threaded into each react-window {@link GridCell} via `cellProps`. */
export interface ICellProps {
  entries: AnimeEntry[];
  columnCount: number;
  gap: number;
  nextAiringMap: Map<number, NextAiring>;
  onSelect: (entry: AnimeEntry) => void;
  onContinue: (entry: AnimeEntry) => void;
  onRemove: (entry: AnimeEntry) => void;
}

export interface ILibraryGridView {
  readonly containerRef: RefObject<HTMLDivElement | null>;
  readonly columnCount: number;
  readonly columnWidth: number;
  readonly rowCount: number;
  readonly rowHeight: number;
  readonly containerWidth: number;
  /** True once the container has been measured and the grid is renderable. */
  readonly canRender: boolean;
  readonly getRowHeight: (index: number) => number;
  readonly cellProps: ICellProps;
}
