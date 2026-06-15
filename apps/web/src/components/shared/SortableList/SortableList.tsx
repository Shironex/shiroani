import { GripVertical } from 'lucide-react';
import { DndContext, closestCenter, type UniqueIdentifier } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { cn } from '@/lib/utils';
import { useSortableList, useSortableListRow } from './SortableList.hooks';
import type { ISortableListProps, ISortableListRowProps } from './SortableList.types';

export default function SortableList<Id extends UniqueIdentifier>({
  items,
  onReorder,
  children,
  className,
}: ISortableListProps<Id>) {
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
}: ISortableListRowProps) {
  const { setNodeRef, style, isDragging, attributes, listeners } = useSortableListRow(id);

  return (
    <div
      ref={setNodeRef}
      style={style}
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
