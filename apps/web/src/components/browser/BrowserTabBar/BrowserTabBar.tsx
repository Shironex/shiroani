import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { DndContext, DragOverlay } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers';
import { cn } from '@/lib/utils';
import { TooltipButton } from '@/components/ui/tooltip-button';
import { useBrowserTabBar, nodeToChipLeaf } from './BrowserTabBar.hooks';
import { SortableTab, TabContent, horizontalListSortingStrategy } from './BrowserTabBar.parts';
import type { IBrowserTabBarProps } from './BrowserTabBar.types';

/**
 * Chromium-like tab strip matching Browser.html `.tabs`:
 *  - Thin 34px bar with dark chrome background
 *  - Rounded-top tabs (8px 8px 0 0) with favicon + title + close
 *  - Active tab gains a primary-tinted bg and subtle top-border glow
 *  - Close button appears on hover (and always on active)
 *  - Inner 60% of each tab acts as a "merge" droppable — dropping a tab there
 *    creates a side-by-side split via `onSplitTabs`.
 */
export default function BrowserTabBar({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onNewTab,
  onReorderTabs,
  onSplitTabs,
}: IBrowserTabBarProps) {
  const { t } = useTranslation('browser');
  const {
    sensors,
    activeDragId,
    mergeTargetId,
    wasDragging,
    activeDragTab,
    collisionDetection,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
    listRef,
    isOverflowing,
  } = useBrowserTabBar(tabs, onReorderTabs, onSplitTabs);

  const tabIds = tabs.map(t => t.id);

  const tabChips = tabs.map(node => {
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
  });

  return (
    <div
      className={cn(
        'flex items-end gap-[2px] h-[38px] px-2 pt-2 shrink-0',
        'bg-card/60 border-b border-border-glass'
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
        {/*
         * A tablist may only contain `tab` children, so the new-tab button is a
         * sibling of the list, not a child of it.
         */}
        <div
          ref={listRef}
          role="tablist"
          aria-label={t('tabs.listLabel')}
          // Sizes to its tabs (not flex-1) so the new-tab button sits right
          // after the last tab, Chrome-style, instead of being pushed to the
          // far edge. `min-w-0` lets it shrink and scroll when tabs overflow.
          className={cn(
            'flex items-end gap-[2px] min-w-0 overflow-x-auto scrollbar-hide',
            isOverflowing &&
              '[mask-image:linear-gradient(to_right,transparent,black_16px,black_calc(100%_-_16px),transparent)]'
          )}
        >
          <SortableContext items={tabIds} strategy={horizontalListSortingStrategy}>
            {tabChips}
          </SortableContext>
        </div>

        {/* New tab button — circle, sits inline next to last tab */}
        <TooltipButton
          variant="ghost"
          size="icon"
          className="size-7 rounded-full mb-[2px] shrink-0"
          onClick={onNewTab}
          data-testid="browser-new-tab"
          tooltip={t('tabs.newTabTooltip')}
          tooltipSide="bottom"
        >
          <Plus className="w-3.5 h-3.5" />
        </TooltipButton>

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
