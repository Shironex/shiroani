import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Globe, X, Columns2 } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import { useSortable, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { MERGE_PREFIX } from './BrowserTabBar.hooks';
import type { ISortableTabProps, ITabContentProps } from './BrowserTabBar.types';

// Re-export for SortableContext consumers (kept colocated with the sortable).
export { horizontalListSortingStrategy };

/** Presentational tab component used for the drag overlay */
export function TabContent({
  tab,
  isActive,
  isSplit,
  onClose,
  isDragOverlay = false,
  isMergeTarget = false,
}: ITabContentProps) {
  const { t } = useTranslation('browser');
  const [imgError, setImgError] = useState(false);

  return (
    <div
      className={cn(
        'group relative flex items-center gap-2 h-[30px] px-3 text-[11.5px] font-medium',
        'rounded-t-[9px] border-b-0 shrink-0 min-w-[120px] max-w-[220px]',
        'transition-colors duration-150',
        isActive
          ? [
              'bg-card/90 text-foreground',
              'border border-border-glass',
              // Primary-tinted top glow
              'shadow-[inset_0_1px_0_oklch(from_var(--primary)_l_c_h/0.35)]',
            ].join(' ')
          : 'text-muted-foreground/90 border border-transparent hover:bg-foreground/[0.04] hover:text-foreground/90',
        isDragOverlay && 'shadow-lg ring-1 ring-primary/30 opacity-90',
        isMergeTarget && 'ring-1 ring-primary/60 bg-primary/[0.08]'
      )}
    >
      {tab.isLoading ? (
        <Loader2 className="w-3 h-3 shrink-0 animate-spin text-primary" />
      ) : tab.favicon && !imgError ? (
        <img
          src={tab.favicon}
          alt=""
          className="w-3.5 h-3.5 shrink-0 rounded-[3px]"
          onError={() => setImgError(true)}
        />
      ) : (
        <Globe className="w-3 h-3 shrink-0 opacity-70" />
      )}
      <span className="truncate flex-1">{tab.title || t('tabs.newTab')}</span>
      {isSplit && !isMergeTarget && (
        <Columns2 className="w-3 h-3 shrink-0 text-primary/70" aria-label={t('tabs.split')} />
      )}
      {isMergeTarget && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-1 left-1/2 w-px bg-primary/70"
        />
      )}
      {onClose && (
        <button
          onClick={onClose}
          aria-label={t('tabs.close')}
          className={cn(
            'grid size-4 place-items-center rounded-sm shrink-0',
            'transition-opacity duration-150',
            'hover:bg-destructive/20 hover:text-destructive',
            isActive ? 'opacity-80 hover:opacity-100' : 'opacity-0 group-hover:opacity-80'
          )}
        >
          <X className="w-2.5 h-2.5" />
        </button>
      )}
    </div>
  );
}

/** Sortable wrapper for each tab, with an inner merge droppable. */
export function SortableTab({
  tab,
  isActive,
  isSplit,
  onSelect,
  onClose,
  wasDragging,
  isMergeTarget,
  isDraggingThisTab,
  splitEnabled,
}: ISortableTabProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tab.id,
  });

  // Inner droppable covers the centre of the tab so dropping there triggers
  // a split rather than a reorder. Disabled when the feature toggle is off
  // and for the tab being dragged so the tab cannot merge into itself.
  const { setNodeRef: setMergeRef } = useDroppable({
    id: `${MERGE_PREFIX}${tab.id}`,
    disabled: !splitEnabled || isDraggingThisTab,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    // Make the original element semi-transparent while dragging
    opacity: isDragging ? 0.4 : 1,
  };

  const handleClick = useCallback(() => {
    // Suppress click if we just finished a drag to prevent accidental tab switch
    if (wasDragging) return;
    onSelect();
  }, [onSelect, wasDragging]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect();
      }
    },
    [onSelect]
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'relative cursor-pointer transition-all duration-150 flex items-end',
        isDragging && 'z-10'
      )}
      role="tab"
      aria-selected={isActive}
      tabIndex={isActive ? 0 : -1}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <TabContent
        tab={tab}
        isActive={isActive}
        isSplit={isSplit}
        onClose={onClose}
        isMergeTarget={isMergeTarget}
      />
      {/* Inner 60% merge target — sits above the tab content but below the close button */}
      <div
        ref={setMergeRef}
        aria-hidden="true"
        className="absolute inset-y-0 left-[20%] right-[20%] pointer-events-none"
      />
    </div>
  );
}
