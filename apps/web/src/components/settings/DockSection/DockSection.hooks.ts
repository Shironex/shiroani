import { useDockStore } from '@/stores/useDockStore';
import { useDockPreviewItems } from '@/hooks/useDockPreviewItems';
import type { IDockSectionProps, IDockSectionView } from './DockSection.types';

export function useDockSection(_props?: IDockSectionProps): IDockSectionView {
  const dockEdge = useDockStore(s => s.edge);
  const setDockEdge = useDockStore(s => s.setEdge);
  const dockItems = useDockPreviewItems();
  const dockAutoHide = useDockStore(s => s.autoHide);
  const setDockAutoHide = useDockStore(s => s.setAutoHide);
  const dockShowLabels = useDockStore(s => s.showLabels);
  const setDockShowLabels = useDockStore(s => s.setShowLabels);
  const dockDraggable = useDockStore(s => s.draggable);
  const setDockDraggable = useDockStore(s => s.setDraggable);
  const resetDockPosition = useDockStore(s => s.resetPosition);

  return {
    dockEdge,
    setDockEdge,
    dockItems,
    dockAutoHide,
    setDockAutoHide,
    dockShowLabels,
    setDockShowLabels,
    dockDraggable,
    setDockDraggable,
    resetDockPosition,
  };
}
