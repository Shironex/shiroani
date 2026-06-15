import type { CSSProperties } from 'react';
import type { ActiveView } from '@/stores/useAppStore';
import type { DockEdge } from '@/stores/useDockStore';
import type { DockDragHandlers } from '@/hooks/useDockDrag';
import type { NavItem } from '@/lib/nav-items';

export interface INavigationDockProps {
  hasBg: boolean;
}

export interface INavigationDockView {
  readonly hasBg: boolean;
  readonly edge: DockEdge;
  readonly vertical: boolean;
  readonly draggable: boolean;
  readonly showLabels: boolean;
  readonly isDragging: boolean;
  readonly justSnapped: boolean;
  readonly showFullDock: boolean;
  readonly visibleItems: NavItem[];
  readonly activeView: ActiveView;
  readonly dockStyle: CSSProperties;
  readonly pillStyle: CSSProperties;
  readonly dragHandlers: DockDragHandlers;
  readonly handleMouseEnter: () => void;
  readonly handleMouseLeave: () => void;
  readonly handleDockAnimationEnd: (e: React.AnimationEvent) => void;
  readonly getAnimationClass: () => string;
  readonly handleNavItemClick: (id: ActiveView) => void;
  readonly handleCollapsedClick: () => void;
}
