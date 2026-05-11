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

export function isViewToggleable(id: ActiveView): boolean {
  return !ALWAYS_VISIBLE_VIEWS.has(id);
}
