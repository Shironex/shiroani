import { useCallback } from 'react';
import type { KeyboardEvent } from 'react';
import { useLibraryStore } from '@/stores/useLibraryStore';
import type { IAnimeCardProps, IAnimeCardView } from './AnimeCard.types';

const { toggleSelected } = useLibraryStore.getState();

export function useAnimeCard({ entry, onSelect }: IAnimeCardProps): IAnimeCardView {
  // Granular per-card subscriptions: each card reads ONLY its own selection
  // membership + the global mode flag, so toggling one card never re-renders
  // the rest of the grid (keeps React.memo effective).
  const selectionMode = useLibraryStore(s => s.selectionMode);
  const isSelected = useLibraryStore(s => s.selectedIds.has(entry.id));

  const handleActivate = useCallback(() => {
    if (selectionMode) {
      toggleSelected(entry.id);
    } else {
      onSelect(entry);
    }
  }, [selectionMode, onSelect, entry]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleActivate();
      }
    },
    [handleActivate]
  );

  return { selectionMode, isSelected, handleActivate, handleKeyDown };
}
