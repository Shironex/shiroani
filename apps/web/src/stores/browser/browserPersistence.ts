import { electronStoreGet, electronStoreSet } from '@/lib/electron-store';

/**
 * Persistence concern for the browser store: the electron-store keys, the
 * settings-merge helper, the persisted-tab schema and its defensive migration.
 * Keys and on-disk shapes here are load-bearing — changing them breaks restore
 * for existing users, so the store treats this module as the source of truth.
 */

/** electron-store key for the browser-settings slice (adblock, popup, whitelist). */
export const BROWSER_SETTINGS_KEY = 'browser-settings';
/** electron-store key for the persisted (flattened) tab session. */
export const BROWSER_TABS_KEY = 'browser-tabs';

/** Debounce window for tab persistence writes. */
export const PERSIST_DEBOUNCE_MS = 1000;

/** Shape of the browser-settings slice as written to / read from disk. */
export interface PersistedBrowserSettings {
  adblockEnabled?: boolean;
  popupBlockEnabled?: boolean;
  adblockWhitelist?: string[];
  restoreTabsOnStartup?: boolean;
  splitTabsEnabled?: boolean;
}

/** Raw browser-settings shape on read, including the legacy `popupBlockMode`. */
export interface RawBrowserSettings {
  adblockEnabled?: boolean;
  popupBlockEnabled?: boolean;
  popupBlockMode?: string;
  adblockWhitelist?: unknown;
  restoreTabsOnStartup?: boolean;
  splitTabsEnabled?: boolean;
}

/** Normalised, validated persisted-tab session. */
export interface MigratedTabs {
  tabs: Array<{ url: string; title: string }>;
  activeIndex: number;
}

/**
 * Persist the browser-settings slice (adblock toggle, popup switch, whitelist)
 * back to electron-store, merging with whatever else lives under that key.
 */
export async function persistBrowserSettings(updates: PersistedBrowserSettings): Promise<void> {
  const existing = (await electronStoreGet<Record<string, unknown>>(BROWSER_SETTINGS_KEY)) ?? {};
  await electronStoreSet(BROWSER_SETTINGS_KEY, { ...existing, ...updates });
}

/**
 * Validate and normalise the persisted browser-tabs payload. Defensive: any
 * unexpected shape from a future version (or a corrupted entry) is dropped
 * rather than crashing the restore. Splits were never persisted, so the
 * incoming shape is always a flat array even after the chunk-9 schema update.
 */
export function migratePersistedTabs(raw: unknown): MigratedTabs | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as { tabs?: unknown; activeIndex?: unknown };
  if (!Array.isArray(candidate.tabs)) return null;

  const tabs: Array<{ url: string; title: string }> = [];
  for (const entry of candidate.tabs) {
    if (!entry || typeof entry !== 'object') continue;
    const e = entry as { url?: unknown; title?: unknown };
    if (typeof e.url !== 'string' || e.url.length === 0) continue;
    tabs.push({ url: e.url, title: typeof e.title === 'string' ? e.title : '' });
  }

  const activeIndex =
    typeof candidate.activeIndex === 'number' && Number.isFinite(candidate.activeIndex)
      ? candidate.activeIndex
      : 0;

  return { tabs, activeIndex };
}
