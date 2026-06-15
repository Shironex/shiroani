import { useCallback } from 'react';
import { useLibraryStore } from '@/stores/useLibraryStore';
import type { ILibraryListItemProps, ILibraryListItemView } from './LibraryListItem.types';

const { toggleSelected } = useLibraryStore.getState();

export function useLibraryListItem({
  entry,
  onClick,
}: ILibraryListItemProps): ILibraryListItemView {
  // Granular per-row subscriptions keep React.memo effective during selection.
  const selectionMode = useLibraryStore(s => s.selectionMode);
  const isSelected = useLibraryStore(s => s.selectedIds.has(entry.id));

  const handleActivate = useCallback(() => {
    if (selectionMode) toggleSelected(entry.id);
    else onClick(entry);
  }, [selectionMode, onClick, entry]);

  return { selectionMode, isSelected, handleActivate };
}
