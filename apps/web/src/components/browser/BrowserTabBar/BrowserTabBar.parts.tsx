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

const CHIP_CLASS = cn(
  'group relative flex items-center gap-2 h-[30px] px-3 text-[11.5px] font-medium',
  'rounded-t-lg border-b-0 shrink-0 min-w-[72px] max-w-[220px]',
  'transition-colors duration-150'
);

function chipStateClass(isActive: boolean, isDragOverlay: boolean, isMergeTarget: boolean): string {
  return cn(
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
  );
}

/** Favicon (or spinner / fallback globe) for a tab chip. */
function TabFavicon({ tab }: { tab: ITabContentProps['tab'] }) {
  const [imgError, setImgError] = useState(false);
  if (tab.isLoading) {
    return <Loader2 className="size-3.5 shrink-0 animate-spin text-primary" />;
  }
  if (tab.favicon && !imgError) {
    return (
      <img
        src={tab.favicon}
        alt=""
        className="size-3.5 shrink-0 rounded-[3px]"
        onError={() => setImgError(true)}
      />
    );
  }
  return <Globe className="size-3.5 shrink-0 opacity-70" />;
}

/**
 * Presentational tab chip used for the drag overlay. Mirrors the interactive
 * chip's look (favicon + title + split indicator) without the role="tab" /
 * close-button affordances, which only the live SortableTab needs.
 */
export function TabContent({
  tab,
  isActive,
  isSplit,
  isDragOverlay = false,
  isMergeTarget = false,
}: ITabContentProps) {
  const { t } = useTranslation('browser');

  return (
    <div className={cn(CHIP_CLASS, chipStateClass(isActive, isDragOverlay, isMergeTarget))}>
      <TabFavicon tab={tab} />
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
    </div>
  );
}

/**
 * Sortable tab chip: a single `role="tab"` element (the only focusable control
 * in the chip) plus a presentational close affordance.
 *
 * A tablist may only contain `tab` children, and a `tab` may not nest another
 * focusable control — so the visible close icon is a non-focusable
 * `<span aria-hidden>` driven by click. Keyboard / screen-reader users close
 * the focused tab with Delete or Backspace, which `aria-keyshortcuts`
 * advertises; mouse users click the X. The whole chip is also the dnd-kit
 * sortable + drag activator.
 */
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
  const { t } = useTranslation('browser');
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
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        // Keyboard-accessible close path — the visible X is presentational.
        e.preventDefault();
        onClose(e);
      }
    },
    [onSelect, onClose]
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      role="tab"
      aria-selected={isActive}
      aria-keyshortcuts="Delete"
      tabIndex={isActive ? 0 : -1}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        'group relative flex cursor-pointer items-center outline-none',
        'focus-visible:ring-2 focus-visible:ring-ring/60 ring-inset',
        'animate-in fade-in-0 slide-in-from-bottom-1 duration-150',
        CHIP_CLASS,
        chipStateClass(isActive, false, isMergeTarget),
        'pr-1',
        isDragging && 'z-10'
      )}
    >
      <TabFavicon tab={tab} />
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
      {/*
       * Kept as a native `title` rather than the Tooltip primitive: this span is
       * role="presentation" / aria-hidden inside a role="tab" (a tab may not nest
       * a focusable Tooltip trigger), so a Radix tooltip would fight that ARIA
       * constraint. The native title is the correct affordance here.
       */}
      <span
        role="presentation"
        aria-hidden="true"
        data-testid="browser-tab-close"
        title={t('tabs.close')}
        onClick={onClose}
        className={cn(
          'ml-1 grid size-4 place-items-center rounded-sm shrink-0',
          'transition-opacity duration-150',
          'hover:bg-destructive/20 hover:text-destructive',
          isActive ? 'opacity-80 hover:opacity-100' : 'opacity-0 group-hover:opacity-80'
        )}
      >
        <X className="w-2.5 h-2.5" />
      </span>
      {/* Inner 60% merge target — sits above the tab content but below the close affordance */}
      <div
        ref={setMergeRef}
        aria-hidden="true"
        className="absolute inset-y-0 left-[20%] right-[20%] pointer-events-none"
      />
    </div>
  );
}
