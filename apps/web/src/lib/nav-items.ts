import type { ActiveView } from '@/stores/useAppStore';

export interface NavItem {
  id: ActiveView;
  label: string;
}

/**
 * All navigation views in display order. Source of truth for the dock +
 * settings toggles.
 *
 * The `label` is the **English canonical fallback** — consumers must
 * resolve the user-visible string via `t('nav:link.<id>', { defaultValue:
 * item.label })`. The fallback is only rendered when the translation is
 * missing, so keeping it in English matches `DEFAULT_LANGUAGE` in
 * `@shiroani/shared`.
 */
export const ALL_NAV_ITEMS: NavItem[] = [
  { id: 'browser', label: 'Browser' },
  { id: 'library', label: 'Library' },
  { id: 'discover', label: 'Discover' },
  { id: 'diary', label: 'Diary' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'feed', label: 'News' },
  { id: 'profile', label: 'Profile' },
  { id: 'changelog', label: 'History' },
  { id: 'settings', label: 'Settings' },
];

/** Views that cannot be hidden — settings is the escape hatch back into the toggle UI. */
export const ALWAYS_VISIBLE_VIEWS: ReadonlySet<ActiveView> = new Set(['settings']);

/** Default dock display order — the static order of {@link ALL_NAV_ITEMS}. */
export const DEFAULT_VIEW_ORDER: ActiveView[] = ALL_NAV_ITEMS.map(item => item.id);

/**
 * Reconcile a (possibly stale) saved order against the current nav items:
 * keep the saved order, drop ids no longer in {@link ALL_NAV_ITEMS}, and
 * append any nav items the saved order is missing (so views added in a future
 * version never disappear). The result always contains every current view id
 * exactly once, in {@link DEFAULT_VIEW_ORDER} for the appended tail.
 */
export function sanitizeViewOrder(saved: unknown): ActiveView[] {
  const known = new Set<ActiveView>(DEFAULT_VIEW_ORDER);
  const seen = new Set<ActiveView>();
  const result: ActiveView[] = [];

  if (Array.isArray(saved)) {
    for (const id of saved) {
      if (known.has(id as ActiveView) && !seen.has(id as ActiveView)) {
        seen.add(id as ActiveView);
        result.push(id as ActiveView);
      }
    }
  }

  for (const id of DEFAULT_VIEW_ORDER) {
    if (!seen.has(id)) result.push(id);
  }

  return result;
}
