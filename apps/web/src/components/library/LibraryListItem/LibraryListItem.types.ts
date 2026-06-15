import type { AnimeEntry } from '@shiroani/shared';

export interface ILibraryListItemProps {
  entry: AnimeEntry;
  nextAiring?: { episode: number; airingAt: number } | null;
  /** Receives the entry so the parent can pass a STABLE callback (keeps memo intact). */
  onClick: (entry: AnimeEntry) => void;
}

export interface ILibraryListItemView {
  readonly selectionMode: boolean;
  readonly isSelected: boolean;
  readonly handleActivate: () => void;
}
