import { useMemo, useState } from 'react';
import { useDockStore } from '@/stores/useDockStore';
import type { ActiveView } from '@/stores/useAppStore';
import { useDockPreviewItems } from '@/hooks/useDockPreviewItems';
import { ITEM_BY_ID } from './ViewsSection.parts';
import type { INavItem, IViewsSectionProps, IViewsSectionView } from './ViewsSection.types';

export function useViewsSection(_props?: IViewsSectionProps): IViewsSectionView {
  const edge = useDockStore(s => s.edge);
  const hiddenViews = useDockStore(s => s.hiddenViews);
  const order = useDockStore(s => s.order);
  const toggleViewVisibility = useDockStore(s => s.toggleViewVisibility);
  const reorderViews = useDockStore(s => s.reorderViews);
  const resetViews = useDockStore(s => s.resetViews);
  const [hoveredId, setHoveredId] = useState<ActiveView | null>(null);

  const dockItems = useDockPreviewItems(hoveredId);

  // Render rows in the user-chosen order; fall back to the static list for any
  // id not yet present in `order` (defensive — initDock keeps these in sync).
  const [orderedItems, orderedIds] = useMemo<[INavItem[], ActiveView[]]>(() => {
    const items = order
      .map(id => ITEM_BY_ID.get(id))
      .filter((item): item is INavItem => item !== undefined);
    return [items, items.map(item => item.id)];
  }, [order]);

  return {
    edge,
    hiddenViews,
    dockItems,
    orderedItems,
    orderedIds,
    hoveredId,
    setHoveredId,
    toggleViewVisibility,
    reorderViews,
    resetViews,
  };
}
