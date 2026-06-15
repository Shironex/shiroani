import type { AnimeEntry } from '@shiroani/shared';

export type NextAiring = { airingAt: number; episode: number };

export interface ILibraryListProps {
  entries: AnimeEntry[];
  nextAiringMap: Map<number, NextAiring>;
  onSelect: (entry: AnimeEntry) => void;
}

/** Props threaded into each react-window {@link LibraryRow} via `rowProps`. */
export interface IRowProps {
  entries: AnimeEntry[];
  nextAiringMap: Map<number, NextAiring>;
  onSelect: (entry: AnimeEntry) => void;
}

export interface ILibraryListView {
  readonly rowCount: number;
  readonly getRowHeight: (index: number) => number;
  readonly rowProps: IRowProps;
}
