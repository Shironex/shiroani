import type { DockEdge } from '@/stores/useDockStore';
import type { DockStageItem } from '@/components/shared/DockStage';

export type IDockSectionProps = Record<string, never>;

export interface IDockSectionView {
  readonly dockEdge: DockEdge;
  readonly setDockEdge: (edge: DockEdge) => void;
  readonly dockItems: DockStageItem[];
  readonly dockAutoHide: boolean;
  readonly setDockAutoHide: (autoHide: boolean) => void;
  readonly dockShowLabels: boolean;
  readonly setDockShowLabels: (showLabels: boolean) => void;
  readonly dockDraggable: boolean;
  readonly setDockDraggable: (draggable: boolean) => void;
  readonly resetDockPosition: () => void;
}
