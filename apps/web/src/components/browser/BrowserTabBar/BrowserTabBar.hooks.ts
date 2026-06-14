import { useCallback, useMemo, useState } from 'react';
import {
  PointerSensor,
  closestCenter,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import type { BrowserNode, BrowserTab } from '@shiroani/shared';
import type { IBrowserTabBarView } from './BrowserTabBar.types';

export const MERGE_PREFIX = 'merge:';

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
export function makeSplitAwareCollisionDetection(mergeIds: Set<string>): CollisionDetection {
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
export function nodeToChipLeaf(node: BrowserNode): BrowserTab & { id: string } {
  if (node.kind === 'leaf') {
    return node;
  }
  let cursor: BrowserNode = node;
  while (cursor.kind === 'split') cursor = cursor.left;
  return { ...cursor, id: node.id };
}

export function useBrowserTabBar(
  tabs: BrowserNode[],
  onReorderTabs: (activeId: string, overId: string) => void,
  onSplitTabs: ((sourceId: string, targetId: string) => void) | undefined
): IBrowserTabBarView {
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

  // Memoize the merge-zone id set + the collision detector so the per-frame
  // pointer-move check during a drag does Set.has lookups instead of
  // allocating strings via startsWith on every droppable.
  const collisionDetection = useMemo(() => {
    const mergeIds = new Set<string>();
    for (const tab of tabs) mergeIds.add(`${MERGE_PREFIX}${tab.id}`);
    return makeSplitAwareCollisionDetection(mergeIds);
  }, [tabs]);

  return {
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
  };
}
