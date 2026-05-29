import type { BrowserHistoryEntry } from '@shiroani/shared';
import { electronStoreGet, electronStoreSet } from '@/lib/electron-store';

/**
 * Persistence concern for the browser store: the electron-store keys, the
 * settings-merge helper, the persisted-tab schema and its defensive migration.
 * Keys and on-disk shapes here are load-bearing — changing them breaks restore
 * for existing users, so the store treats this module as the source of truth.
 */

/** electron-store key for the browser-settings slice (adblock, popup, whitelist). */
export const BROWSER_SETTINGS_KEY = 'browser-settings';
/** electron-store key for the persisted tab session (split tree). */
export const BROWSER_TABS_KEY = 'browser-tabs';
/** electron-store key for chronological browsing history. */
export const BROWSER_HISTORY_KEY = 'browser-history';

/** Debounce window for tab persistence writes. */
export const PERSIST_DEBOUNCE_MS = 1000;

/**
 * Upper bound on stored history entries. Capped to avoid unbounded growth of
 * the persisted slice; oldest entries are evicted once exceeded.
 */
export const BROWSER_HISTORY_MAX_ENTRIES = 500;

/**
 * Validate and normalise a persisted history payload. Defensive — any entry
 * with a missing/invalid url or timestamp is dropped rather than crashing the
 * restore. Returns newest-first, matching the in-memory ordering.
 */
export function migratePersistedHistory(raw: unknown): BrowserHistoryEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: BrowserHistoryEntry[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const e = entry as Partial<BrowserHistoryEntry>;
    if (typeof e.url !== 'string' || e.url.length === 0) continue;
    if (typeof e.visitedAt !== 'number' || !Number.isFinite(e.visitedAt)) continue;
    out.push({
      id: typeof e.id === 'string' && e.id.length > 0 ? e.id : crypto.randomUUID(),
      url: e.url,
      title: typeof e.title === 'string' ? e.title : '',
      favicon: typeof e.favicon === 'string' ? e.favicon : undefined,
      visitedAt: e.visitedAt,
    });
  }
  return out.slice(0, BROWSER_HISTORY_MAX_ENTRIES);
}

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

/**
 * Serialized form of a single tab node. Mirrors `BrowserNode` but strips
 * runtime-only fields (ids, loading/navigation flags) — ids are regenerated on
 * restore, the rest reset to their initial state. A leaf may carry `active` to
 * mark the focused pane within the restored session.
 */
export type SerializedBrowserNode =
  | { kind: 'leaf'; url: string; title: string; active?: boolean }
  | {
      kind: 'split';
      orientation: 'horizontal' | 'vertical';
      ratio: number;
      left: SerializedBrowserNode;
      right: SerializedBrowserNode;
    };

/** Normalised, validated persisted-tab session (split tree preserved). */
export interface MigratedTabs {
  tabs: SerializedBrowserNode[];
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
 * Validate and normalise a single serialized node. Returns null when the shape
 * is unrecognised or both children of a split fail to parse, so corrupt
 * subtrees collapse gracefully instead of crashing the restore.
 */
function migrateNode(raw: unknown): SerializedBrowserNode | null {
  if (!raw || typeof raw !== 'object') return null;
  const node = raw as Record<string, unknown>;

  if (node.kind === 'split') {
    const left = migrateNode(node.left);
    const right = migrateNode(node.right);
    // If one side is gone, promote the survivor; if both are gone, drop it.
    if (!left && !right) return null;
    if (!left) return right;
    if (!right) return left;
    const orientation = node.orientation === 'vertical' ? 'vertical' : 'horizontal';
    const ratio =
      typeof node.ratio === 'number' && Number.isFinite(node.ratio)
        ? Math.min(0.8, Math.max(0.2, node.ratio))
        : 0.5;
    return { kind: 'split', orientation, ratio, left, right };
  }

  // Treat anything else as a leaf (covers both new `kind: 'leaf'` nodes and the
  // legacy flat `{ url, title }` shape that had no discriminator).
  if (typeof node.url !== 'string' || node.url.length === 0) return null;
  return {
    kind: 'leaf',
    url: node.url,
    title: typeof node.title === 'string' ? node.title : '',
    active: node.active === true,
  };
}

/**
 * Validate and normalise the persisted browser-tabs payload. Defensive: any
 * unexpected shape from a future version (or a corrupted entry) is dropped
 * rather than crashing the restore.
 *
 * Back-compat: older builds wrote a flat `{ tabs: {url,title}[], activeIndex }`
 * shape (splits were flattened on disk). Both that legacy shape and the new
 * tree shape are accepted — the legacy `activeIndex` is mapped onto an `active`
 * flag on the corresponding leaf.
 */
export function migratePersistedTabs(raw: unknown): MigratedTabs | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as { tabs?: unknown; activeIndex?: unknown };
  if (!Array.isArray(candidate.tabs)) return null;

  const tabs: SerializedBrowserNode[] = [];
  for (const entry of candidate.tabs) {
    const node = migrateNode(entry);
    if (node) tabs.push(node);
  }
  if (tabs.length === 0) return null;

  // Legacy payloads carried `activeIndex` rather than an inline `active` flag.
  // Only honour it when no leaf already declares itself active.
  const hasActiveFlag = tabs.some(nodeHasActiveLeaf);
  if (!hasActiveFlag && typeof candidate.activeIndex === 'number') {
    const idx = Math.min(Math.max(0, candidate.activeIndex), tabs.length - 1);
    const target = tabs[idx];
    if (target && target.kind === 'leaf') target.active = true;
  }

  return { tabs };
}

function nodeHasActiveLeaf(node: SerializedBrowserNode): boolean {
  if (node.kind === 'leaf') return node.active === true;
  return nodeHasActiveLeaf(node.left) || nodeHasActiveLeaf(node.right);
}
