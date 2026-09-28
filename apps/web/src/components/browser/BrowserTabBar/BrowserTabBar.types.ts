import type { KeyboardEvent, MouseEvent, RefObject } from 'react';
import type {
  CollisionDetection,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  SensorDescriptor,
  SensorOptions,
} from '@dnd-kit/core';
import type { BrowserNode, BrowserTab } from '@shiroani/shared';
import type { TabAudioState } from '@/stores/browser/browserTree';

export interface IBrowserTabBarProps {
  tabs: BrowserNode[];
  activeTabId: string | null;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onNewTab: () => void;
  onReorderTabs: (activeId: string, overId: string) => void;
  onSplitTabs?: (sourceId: string, targetId: string) => void;
  /** Mute or unmute every pane of a tab (speaker icon click or the M key on a focused tab). */
  onToggleTabMuted?: (id: string) => void;
}

export interface IBrowserTabBarView {
  readonly sensors: SensorDescriptor<SensorOptions>[];
  readonly activeDragId: string | null;
  readonly mergeTargetId: string | null;
  readonly wasDragging: boolean;
  readonly activeDragTab: (BrowserTab & { id: string }) | null;
  /** The top-level node being dragged (a split keeps its whole tree for the audio indicator). */
  readonly activeDragNode: BrowserNode | null;
  readonly collisionDetection: CollisionDetection;
  readonly handleDragStart: (event: DragStartEvent) => void;
  readonly handleDragOver: (event: DragOverEvent) => void;
  readonly handleDragEnd: (event: DragEndEvent) => void;
  readonly handleDragCancel: () => void;
  readonly listRef: RefObject<HTMLDivElement | null>;
  readonly isOverflowing: boolean;
}

export interface ITabContentProps {
  tab: BrowserTab;
  isActive: boolean;
  isSplit?: boolean;
  isDragOverlay?: boolean;
  isMergeTarget?: boolean;
  /** Audio indicator for the whole tab; `null` hides it. */
  audioState?: TabAudioState;
}

export interface ISortableTabProps {
  tab: BrowserTab;
  isActive: boolean;
  isSplit: boolean;
  onSelect: () => void;
  /** Fired from the close affordance (click) or the Delete/Backspace shortcut. */
  onClose: (e: MouseEvent | KeyboardEvent) => void;
  /** Audio indicator for the whole tab; `null` hides it. */
  audioState: TabAudioState;
  /** Fired from the speaker icon (click) or the M shortcut on the focused tab. */
  onToggleMute: (e: MouseEvent | KeyboardEvent) => void;
  wasDragging: boolean;
  isMergeTarget: boolean;
  isDraggingThisTab: boolean;
  splitEnabled: boolean;
}
