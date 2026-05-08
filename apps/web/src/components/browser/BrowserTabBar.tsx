import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Globe, X, Plus, Columns2 } from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import { SortableContext, useSortable, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers';
import { cn } from '@/lib/utils';
import { TooltipButton } from '@/components/ui/tooltip-button';
import type { BrowserNode, BrowserTab } from '@shiroani/shared';

interface BrowserTabBarProps {
  tabs: BrowserNode[];
  activeTabId: string | null;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onNewTab: () => void;
  onReorderTabs: (activeId: string, overId: string) => void;
  onSplitTabs?: (sourceId: string, targetId: string) => void;
}

const MERGE_PREFIX = 'merge:';

/**
 * Build a pointer-aware collision detector that prefers the merge zone the
 * cursor is over (so dropping in the inner 60% of a tab triggers a split)
 * and falls back to closestCenter against the sortable tabs. The set of
 * merge-zone droppable ids is captured once per drag (recomputed only when
 * the tab list changes), so the per-pointer-move check is O(1) Set.has and
 * doesn't allocate strings on every frame.
 *
 * Per-frame allocation budget: a single sortable-only `droppableContainers`
 * array on the closestCenter fallback. The merge-hit path lazily builds an
 * array only when at least one merge zone is under the pointer, so the
 * common case (no merge zones) skips array allocation entirely.
 */
function makeSplitAwareCollisionDetection(mergeIds: Set<string>): CollisionDetection {
  if (mergeIds.size === 0) {
    return closestCenter;
  }
  return args => {
    const pointerHits = pointerWithin(args);
    let mergeHits: typeof pointerHits | null = null;
    for (const hit of pointerHits) {
      if (mergeIds.has(String(hit.id))) {
        (mergeHits ??= []).push(hit);
      }
    }
    if (mergeHits) return mergeHits;

    return closestCenter({
      ...args,
      droppableContainers: args.droppableContainers.filter(c => !mergeIds.has(String(c.id))),
    });
  };
}

/**
 * Derive the chip-friendly leaf representation for a top-level node. Splits
 * surface their first leaf so the strip still has a favicon and title.
 */
function nodeToChipLeaf(node: BrowserNode): BrowserTab & { id: string } {
  if (node.kind === 'leaf') {
    return node;
  }
  let cursor: BrowserNode = node;
  while (cursor.kind === 'split') cursor = cursor.left;
  return { ...cursor, id: node.id };
}

/**
 * Chromium-like tab strip matching Browser.html `.tabs`:
 *  - Thin 34px bar with dark chrome background
 *  - Rounded-top tabs (8px 8px 0 0) with favicon + title + close
 *  - Active tab gains a primary-tinted bg and subtle top-border glow
 *  - Close button appears on hover (and always on active)
 *  - Inner 60% of each tab acts as a "merge" droppable — dropping a tab there
 *    creates a side-by-side split via `onSplitTabs`.
 */

/** Presentational tab component used for the drag overlay */
function TabContent({
  tab,
  isActive,
  isSplit,
  onClose,
  isDragOverlay = false,
  isMergeTarget = false,
}: {
  tab: BrowserTab;
  isActive: boolean;
  isSplit?: boolean;
  onClose?: (e: React.MouseEvent) => void;
  isDragOverlay?: boolean;
  isMergeTarget?: boolean;
}) {
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
function SortableTab({
  tab,
  isActive,
  isSplit,
  onSelect,
  onClose,
  wasDragging,
  isMergeTarget,
  isDraggingThisTab,
  splitEnabled,
}: {
  tab: BrowserTab;
  isActive: boolean;
  isSplit: boolean;
  onSelect: () => void;
  onClose: (e: React.MouseEvent) => void;
  wasDragging: boolean;
  isMergeTarget: boolean;
  isDraggingThisTab: boolean;
  splitEnabled: boolean;
}) {
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

export function BrowserTabBar({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onNewTab,
  onReorderTabs,
  onSplitTabs,
}: BrowserTabBarProps) {
  const { t } = useTranslation('browser');
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState<string | null>(null);
  const [wasDragging, setWasDragging] = useState(false);

  // Use PointerSensor with a distance activation constraint so that
  // small clicks don't trigger drag, and the close button still works
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const activeDragNode = activeDragId ? (tabs.find(t => t.id === activeDragId) ?? null) : null;
  const activeDragTab = activeDragNode ? nodeToChipLeaf(activeDragNode) : null;

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
    setWasDragging(true);
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const overId = event.over?.id;
    if (typeof overId === 'string' && overId.startsWith(MERGE_PREFIX)) {
      setMergeTargetId(overId.slice(MERGE_PREFIX.length));
    } else {
      setMergeTargetId(null);
    }
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveDragId(null);
      setMergeTargetId(null);

      if (!over) {
        requestAnimationFrame(() => setWasDragging(false));
        return;
      }

      const overId = over.id as string;
      const activeId = active.id as string;

      if (overId.startsWith(MERGE_PREFIX)) {
        const targetId = overId.slice(MERGE_PREFIX.length);
        if (targetId !== activeId && onSplitTabs) {
          onSplitTabs(activeId, targetId);
        }
      } else if (activeId !== overId) {
        onReorderTabs(activeId, overId);
      }

      requestAnimationFrame(() => setWasDragging(false));
    },
    [onReorderTabs, onSplitTabs]
  );

  const handleDragCancel = useCallback(() => {
    setActiveDragId(null);
    setMergeTargetId(null);
    requestAnimationFrame(() => {
      setWasDragging(false);
    });
  }, []);

  const tabIds = tabs.map(t => t.id);

  // Memoize the merge-zone id set + the collision detector so the per-frame
  // pointer-move check during a drag does Set.has lookups instead of
  // allocating strings via startsWith on every droppable.
  const collisionDetection = useMemo(() => {
    const mergeIds = new Set<string>();
    for (const tab of tabs) mergeIds.add(`${MERGE_PREFIX}${tab.id}`);
    return makeSplitAwareCollisionDetection(mergeIds);
  }, [tabs]);

  return (
    <div
      className={cn(
        'flex items-end gap-[2px] h-[38px] px-2 pt-2 shrink-0',
        'bg-[oklch(from_var(--card)_l_c_h/0.6)] border-b border-border-glass'
      )}
    >
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        modifiers={[restrictToHorizontalAxis]}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div
          role="tablist"
          className="flex items-end gap-[2px] flex-1 min-w-0 overflow-x-auto scrollbar-hide"
        >
          <SortableContext items={tabIds} strategy={horizontalListSortingStrategy}>
            {tabs.map(node => {
              const chipLeaf = nodeToChipLeaf(node);
              return (
                <SortableTab
                  key={node.id}
                  tab={chipLeaf}
                  isActive={node.id === activeTabId}
                  isSplit={node.kind === 'split'}
                  isMergeTarget={mergeTargetId === node.id}
                  isDraggingThisTab={activeDragId === node.id}
                  splitEnabled={!!onSplitTabs}
                  onSelect={() => onSelectTab(node.id)}
                  onClose={e => {
                    e.stopPropagation();
                    onCloseTab(node.id);
                  }}
                  wasDragging={wasDragging}
                />
              );
            })}
          </SortableContext>

          {/* New tab button — circle, sits inline next to last tab */}
          <TooltipButton
            variant="ghost"
            size="icon"
            className="size-7 rounded-full mb-[2px] shrink-0"
            onClick={onNewTab}
            tooltip={t('tabs.newTabTooltip')}
            tooltipSide="bottom"
          >
            <Plus className="w-3.5 h-3.5" />
          </TooltipButton>
        </div>

        {/* Drag overlay renders the dragged tab above everything */}
        <DragOverlay dropAnimation={null}>
          {activeDragTab ? (
            <TabContent
              tab={activeDragTab}
              isActive={activeDragTab.id === activeTabId}
              isDragOverlay
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
