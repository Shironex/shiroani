import { useMemo } from 'react';
import {
  BookOpen,
  Calendar,
  Compass,
  History,
  NotebookPen,
  Rss,
  Settings,
  User,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useDockStore } from '@/stores/useDockStore';
import type { ActiveView } from '@/stores/useAppStore';
import { ALL_NAV_ITEMS, ALWAYS_VISIBLE_VIEWS } from '@/lib/nav-items';
import { APP_LOGO_URL } from '@/lib/constants';
import type { DockStageItem } from '@/components/shared/DockStage';

const ICON_BY_VIEW: Partial<Record<ActiveView, LucideIcon>> = {
  library: BookOpen,
  discover: Compass,
  diary: NotebookPen,
  schedule: Calendar,
  feed: Rss,
  profile: User,
  changelog: History,
  settings: Settings,
};

/**
 * Returns a memoized `DockStageItem[]` representing the currently visible
 * navigation slots. Pass `hoveredId` to highlight a specific slot (used by
 * `ViewsSection`'s hover interaction); omit it for a static preview.
 *
 * Single source of truth for the icon map and mascot slot across
 * `ViewsSection`, `DockSection`, and `DockStep`.
 */
export function useDockPreviewItems(hoveredId: ActiveView | null = null): DockStageItem[] {
  const hiddenViews = useDockStore(s => s.hiddenViews);
  const order = useDockStore(s => s.order);

  return useMemo<DockStageItem[]>(() => {
    const labelById = new Map(ALL_NAV_ITEMS.map(item => [item.id, item]));
    const hiddenSet = new Set(hiddenViews);

    return order
      .filter(id => labelById.has(id) && (ALWAYS_VISIBLE_VIEWS.has(id) || !hiddenSet.has(id)))
      .map(id => {
        const Icon = ICON_BY_VIEW[id];
        const icon =
          id === 'browser' ? (
            <img
              src={APP_LOGO_URL}
              alt=""
              draggable={false}
              className="h-3.5 w-3.5 object-contain"
            />
          ) : Icon ? (
            <Icon className="h-3 w-3" />
          ) : undefined;
        return {
          id,
          highlighted: hoveredId === id,
          icon,
        };
      });
  }, [order, hiddenViews, hoveredId]);
}
