import { useCallback, type ReactNode } from 'react';
import { GripVertical } from 'lucide-react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { cn } from '@/lib/utils';

/**
 * Shared dnd-kit harness for the settings drag-to-reorder lists (Widoki panel
 * order, New Tab panel order). Owns the sensor setup, the drag-end → reorder
 * bridge and the vertical-axis restriction so each section only declares its
 * item ids and a typed reorder callback.
 */
export function useSortableList<Id extends UniqueIdentifier>(
  onReorder: (activeId: Id, overId: Id) => void
) {
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

interface SortableListProps<Id extends UniqueIdentifier> {
  items: readonly Id[];
  onReorder: (activeId: Id, overId: Id) => void;
  children: ReactNode;
  className?: string;
}

export function SortableList<Id extends UniqueIdentifier>({
  items,
  onReorder,
  children,
  className,
}: SortableListProps<Id>) {
  const { sensors, handleDragEnd } = useSortableList(onReorder);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items as Id[]} strategy={verticalListSortingStrategy}>
        <div className={cn('flex flex-col gap-2', className)}>{children}</div>
      </SortableContext>
    </DndContext>
  );
}

interface SortableListRowProps {
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

/**
 * Presentational sortable row: the drag grip button + the dragging affordance
 * (ring/shadow while picked up). Each section supplies its own label and control
 * as `children`, keeping the dnd wiring in one place. Mirrors the previous
 * SortableViewRow / SortablePanelRow chrome verbatim.
 */
export function SortableListRow({
  id,
  dragHandleLabel,
  children,
  className,
  onMouseEnter,
  onMouseLeave,
  onGripFocus,
  onGripBlur,
}: SortableListRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cn(
        'flex items-center gap-2 rounded-lg border border-border-glass/70 bg-background/30 px-2.5 py-2 transition-colors duration-150 hover:border-border-glass',
        isDragging && 'relative z-10 border-border-glass shadow-lg ring-1 ring-primary/30',
        className
      )}
    >
      <button
        type="button"
        aria-label={dragHandleLabel}
        title={dragHandleLabel}
        className={cn(
          'flex flex-shrink-0 cursor-grab touch-none items-center justify-center rounded-md p-0.5 text-muted-foreground/50 transition-colors',
          'hover:bg-foreground/5 hover:text-foreground active:cursor-grabbing',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-card'
        )}
        {...attributes}
        {...listeners}
        onFocus={onGripFocus}
        onBlur={onGripBlur}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      {children}
    </div>
  );
}
