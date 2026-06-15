import type { Dispatch, SetStateAction } from 'react';
import type { ActiveView } from '@/stores/useAppStore';
import type { DockEdge } from '@/stores/useDockStore';
import type { DockStageItem } from '@/components/shared/DockStage';
import type { NavItem } from '@/lib/nav-items';

export type INavItem = NavItem;

export type IViewsSectionProps = Record<string, never>;

export interface IViewsSectionView {
  readonly edge: DockEdge;
  readonly hiddenViews: ActiveView[];
  readonly dockItems: DockStageItem[];
  readonly orderedItems: INavItem[];
  readonly orderedIds: ActiveView[];
  readonly hoveredId: ActiveView | null;
  readonly setHoveredId: Dispatch<SetStateAction<ActiveView | null>>;
  readonly toggleViewVisibility: (view: ActiveView) => void;
  readonly reorderViews: (activeId: ActiveView, overId: ActiveView) => void;
  readonly resetViews: () => void;
}
