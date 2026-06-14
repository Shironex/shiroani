import { useDockStore } from '@/stores/useDockStore';
import { useDockPreviewItems } from '@/hooks/useDockPreviewItems';
import type { IDockStepView } from './DockStep.types';

export function useDockStep(): IDockStepView {
  const edge = useDockStore(s => s.edge);
  const setEdge = useDockStore(s => s.setEdge);
  const dockItems = useDockPreviewItems();
  const autoHide = useDockStore(s => s.autoHide);
  const setAutoHide = useDockStore(s => s.setAutoHide);
  const showLabels = useDockStore(s => s.showLabels);
  const setShowLabels = useDockStore(s => s.setShowLabels);
  const draggable = useDockStore(s => s.draggable);
  const setDraggable = useDockStore(s => s.setDraggable);

  return {
    edge,
    setEdge,
    dockItems,
    autoHide,
    setAutoHide,
    showLabels,
    setShowLabels,
    draggable,
    setDraggable,
  };
}
