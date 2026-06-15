import { useCallback } from 'react';
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ISortableListView, ISortableListRowView } from './SortableList.types';

/**
 * Shared dnd-kit harness for the settings drag-to-reorder lists (Widoki panel
 * order, New Tab panel order). Owns the sensor setup, the drag-end → reorder
 * bridge and the vertical-axis restriction so each section only declares its
 * item ids and a typed reorder callback.
 */
export function useSortableList<Id extends UniqueIdentifier>(
  onReorder: (activeId: Id, overId: Id) => void
): ISortableListView {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        onReorder(active.id as Id, over.id as Id);
      }
    },
    [onReorder]
  );

  return { sensors, handleDragEnd };
}

/** Per-row dnd-kit wiring for {@link SortableListRow}. */
export function useSortableListRow(id: UniqueIdentifier): ISortableListRowView {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  return {
    setNodeRef,
    style: { transform: CSS.Transform.toString(transform), transition },
    isDragging,
    attributes,
    listeners,
  };
}
