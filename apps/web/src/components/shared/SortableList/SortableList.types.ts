import type { ReactNode } from 'react';
import type {
  DragEndEvent,
  DraggableAttributes,
  SensorDescriptor,
  SensorOptions,
  UniqueIdentifier,
} from '@dnd-kit/core';
import type { useSortable } from '@dnd-kit/sortable';

/** dnd-kit's `listeners` map is not exported by name; derive it from `useSortable`. */
type SortableListeners = ReturnType<typeof useSortable>['listeners'];

export interface ISortableListProps<Id extends UniqueIdentifier> {
  items: readonly Id[];
  onReorder: (activeId: Id, overId: Id) => void;
  children: ReactNode;
  className?: string;
}

export interface ISortableListRowProps {
  id: UniqueIdentifier;
  /** Accessible label for the drag grip. */
  dragHandleLabel: string;
  /** Per-item content rendered after the grip (label, badge, control). */
  children: ReactNode;
  className?: string;
  /** Row hover wiring — used by the Widoki section to highlight the dock preview. */
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  /** Grip keyboard-focus wiring, mirrored to the same highlight as hover. */
  onGripFocus?: () => void;
  onGripBlur?: () => void;
}

export interface ISortableListView {
  readonly sensors: SensorDescriptor<SensorOptions>[];
  readonly handleDragEnd: (event: DragEndEvent) => void;
}

export interface ISortableListRowView {
  readonly setNodeRef: (node: HTMLElement | null) => void;
  readonly style: { transform: string | undefined; transition: string | undefined };
  readonly isDragging: boolean;
  readonly attributes: DraggableAttributes;
  readonly listeners: SortableListeners;
}
