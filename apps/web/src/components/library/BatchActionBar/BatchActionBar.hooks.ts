import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useDockStore } from '@/stores/useDockStore';
import { getStatusOptions } from '@/lib/constants';
import type { AnimeStatus } from '@shiroani/shared';
import type { IBatchActionBarView } from './BatchActionBar.types';

const { batchUpdateStatus, batchUpdateScore, batchRemove, setSelectionMode, clearSelection } =
  useLibraryStore.getState();

export function useBatchActionBar(): IBatchActionBarView {
  const { i18n } = useTranslation('library');
  const count = useLibraryStore(s => s.selectedIds.size);
  const statusOptions = useMemo(() => getStatusOptions(), [i18n.language]);

  const [showConfirm, setShowConfirm] = useState(false);

  // The NavigationDock floats over content (position: fixed) and, at its default
  // bottom-center position, sits directly on top of this full-width bar. Reserve
  // vertical space below the bar's content so the dock clears it. Only the bottom
  // edge collides — other edges float beside the content and need no spacing.
  const dockOnBottom = useDockStore(s => s.edge === 'bottom');
  // Dock pill (~60px) + its 12px viewport margin + breathing room.
  const dockClearanceClass = dockOnBottom ? 'pb-[5.5rem]' : '';

  const handleStatusChange = useCallback((value: string) => {
    batchUpdateStatus(value as AnimeStatus);
    clearSelection();
  }, []);

  const handleScoreChange = useCallback((value: string) => {
    batchUpdateScore(parseInt(value, 10));
    clearSelection();
  }, []);

  const handleExit = useCallback(() => setSelectionMode(false), []);

  const handleConfirmDelete = useCallback(() => {
    batchRemove();
    setShowConfirm(false);
  }, []);

  return {
    count,
    statusOptions,
    showConfirm,
    setShowConfirm,
    dockClearanceClass,
    handleStatusChange,
    handleScoreChange,
    handleExit,
    handleConfirmDelete,
  };
}
