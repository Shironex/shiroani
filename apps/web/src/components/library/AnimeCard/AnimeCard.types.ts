import type { KeyboardEvent } from 'react';
import type { AnimeEntry } from '@shiroani/shared';

export interface IAnimeCardProps {
  entry: AnimeEntry;
  nextAiring?: { airingAt: number; episode: number } | null;
  onSelect: (entry: AnimeEntry) => void;
  onContinue?: (entry: AnimeEntry) => void;
  onRemove?: (entry: AnimeEntry) => void;
}

export interface IAnimeCardView {
  readonly selectionMode: boolean;
  readonly isSelected: boolean;
  readonly handleActivate: () => void;
  readonly handleKeyDown: (e: KeyboardEvent) => void;
}
