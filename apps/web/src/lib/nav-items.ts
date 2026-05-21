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
 * Reconcile a (possibly stale) saved order against a canonical default order:
 * keep the saved order, drop ids no longer in `defaultOrder`, and append any
 * ids the saved order is missing (so entries added in a future version never
 * disappear). The result always contains every id in `defaultOrder` exactly
 * once — known ids in their saved order, missing ones appended in
 * `defaultOrder` sequence.
 */
export function reconcileOrder<T>(saved: unknown, defaultOrder: readonly T[]): T[] {
  const known = new Set<T>(defaultOrder);
  const seen = new Set<T>();
  const result: T[] = [];

  if (Array.isArray(saved)) {
    for (const id of saved) {
      if (known.has(id as T) && !seen.has(id as T)) {
        seen.add(id as T);
        result.push(id as T);
      }
    }
  }

  for (const id of defaultOrder) {
    if (!seen.has(id)) {
      seen.add(id);
      result.push(id);
    }
  }

  return result;
}

/**
 * Reconcile a (possibly stale) saved nav order against the current nav items.
 * See {@link reconcileOrder}; uses {@link DEFAULT_VIEW_ORDER} as the canonical
 * order so views added in a future version never disappear.
 */
export function sanitizeViewOrder(saved: unknown): ActiveView[] {
  return reconcileOrder(saved, DEFAULT_VIEW_ORDER);
}
