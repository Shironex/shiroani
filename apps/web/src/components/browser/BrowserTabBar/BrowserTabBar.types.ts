import type { MouseEvent } from 'react';
import type {
  CollisionDetection,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  SensorDescriptor,
  SensorOptions,
} from '@dnd-kit/core';
import type { BrowserNode, BrowserTab } from '@shiroani/shared';

export interface IBrowserTabBarProps {
  tabs: BrowserNode[];
  activeTabId: string | null;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onNewTab: () => void;
  onReorderTabs: (activeId: string, overId: string) => void;
  onSplitTabs?: (sourceId: string, targetId: string) => void;
}

export interface IBrowserTabBarView {
  readonly sensors: SensorDescriptor<SensorOptions>[];
  readonly activeDragId: string | null;
  readonly mergeTargetId: string | null;
  readonly wasDragging: boolean;
  readonly activeDragTab: (BrowserTab & { id: string }) | null;
  readonly collisionDetection: CollisionDetection;
  readonly handleDragStart: (event: DragStartEvent) => void;
  readonly handleDragOver: (event: DragOverEvent) => void;
  readonly handleDragEnd: (event: DragEndEvent) => void;
  readonly handleDragCancel: () => void;
}

export interface ITabContentProps {
  tab: BrowserTab;
  isActive: boolean;
  isSplit?: boolean;
  onClose?: (e: MouseEvent) => void;
  isDragOverlay?: boolean;
  isMergeTarget?: boolean;
}

export interface ISortableTabProps {
  tab: BrowserTab;
  isActive: boolean;
  isSplit: boolean;
  onSelect: () => void;
  onClose: (e: MouseEvent) => void;
  wasDragging: boolean;
  isMergeTarget: boolean;
  isDraggingThisTab: boolean;
  splitEnabled: boolean;
}
