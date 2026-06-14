import type { DockEdge } from '@/stores/useDockStore';
import type { DockStageItem } from '@/components/shared/DockStage';

export interface IDockStepView {
  readonly edge: DockEdge;
  readonly setEdge: (edge: DockEdge) => void;
  readonly dockItems: DockStageItem[];
  readonly autoHide: boolean;
  readonly setAutoHide: (value: boolean) => void;
  readonly showLabels: boolean;
  readonly setShowLabels: (value: boolean) => void;
  readonly draggable: boolean;
  readonly setDraggable: (value: boolean) => void;
}
