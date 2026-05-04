/**
 * Feed bookmarks store — user-saved feed articles with electron-store persistence
 * and localStorage fallback. Persists full item snapshots (not just IDs) so a
 * bookmarked article stays accessible even if the source is later disabled,
 * filtered out, or paged away from the loaded window.
 */
import { create } from 'zustand';
import { maybeDevtools } from '@/stores/utils/maybeDevtools';
import { createLogger } from '@shiroani/shared';
import type { FeedItem } from '@shiroani/shared';
import { electronStoreGet, electronStoreSet } from '@/lib/electron-store';

const logger = createLogger('FeedBookmarksStore');

const STORE_KEY = 'shiroani:feed-bookmarks';
const MAX_BOOKMARKS = 500;

// ─── Snapshot type ───────────────────────────────────────────────────────────

/**
 * A minimal, self-contained copy of the fields needed to render a bookmarked
 * feed item outside of the currently-loaded feed window.
 */
export interface FeedBookmarkSnapshot {
  id: number;
  title: string;
  url: string;
  sourceName: string;
  sourceColor: string;
  publishedAt?: string;
  imageUrl?: string;
  description?: string;
  /** Epoch ms when the bookmark was toggled on. */
  bookmarkedAt: number;
}

function snapshotFromItem(item: FeedItem): FeedBookmarkSnapshot {
  return {
    id: item.id,
    title: item.title,
    url: item.url,
    sourceName: item.sourceName,
    sourceColor: item.sourceColor,
    publishedAt: item.publishedAt,
    imageUrl: item.imageUrl,
    description: item.description,
    bookmarkedAt: Date.now(),
  };
}

// ─── Persistence ─────────────────────────────────────────────────────────────

async function loadPersisted(): Promise<FeedBookmarkSnapshot[]> {
  try {
    if (window.electronAPI?.store) {
      const data = await electronStoreGet<FeedBookmarkSnapshot[]>(STORE_KEY);
      if (Array.isArray(data)) return data;
    }
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as FeedBookmarkSnapshot[]) : [];
  } catch (err) {
    logger.warn('Failed to load feed bookmarks:', err);
    return [];
  }
}

function persist(map: Map<number, FeedBookmarkSnapshot>) {
  const serialised = JSON.stringify(Array.from(map.values()));
  try {
    localStorage.setItem(STORE_KEY, serialised);
  } catch {
    // storage unavailable — in-memory remains authoritative
  }
  void electronStoreSet(STORE_KEY, Array.from(map.values())).catch(() => {
    // ignore — localStorage is the primary fallback
  });
}

// ─── State & actions ─────────────────────────────────────────────────────────

interface FeedBookmarksState {
  /** Map keyed by feed item id for O(1) lookups. */
  bookmarks: Map<number, FeedBookmarkSnapshot>;
  loaded: boolean;
}

interface FeedBookmarksActions {
  load: () => Promise<void>;
  toggle: (item: FeedItem) => void;
  isBookmarked: (id: number) => boolean;
  clear: () => void;
}

type FeedBookmarksStore = FeedBookmarksState & FeedBookmarksActions;

export const useFeedBookmarksStore = create<FeedBookmarksStore>()(
  maybeDevtools(
    (set, get) => ({
      // Initial state
      bookmarks: new Map(),
      loaded: false,

      // Actions
      load: async () => {
        const list = await loadPersisted();
        const map = new Map<number, FeedBookmarkSnapshot>();
        for (const snap of list) {
          if (snap && typeof snap.id === 'number') map.set(snap.id, snap);
        }
        set({ bookmarks: map, loaded: true }, undefined, 'feedBookmarks/load');
        logger.info(`Loaded ${map.size} feed bookmark(s)`);
      },

      toggle: (item: FeedItem) => {
        const { bookmarks } = get();
        const next = new Map(bookmarks);

        if (next.has(item.id)) {
          next.delete(item.id);
        } else {
          if (next.size >= MAX_BOOKMARKS) {
            // Drop the oldest bookmark to stay within the cap.
            let oldestId: number | null = null;
            let oldestTs = Number.POSITIVE_INFINITY;
            for (const [id, snap] of next) {
              if (snap.bookmarkedAt < oldestTs) {
                oldestTs = snap.bookmarkedAt;
                oldestId = id;
              }
            }
            if (oldestId !== null) next.delete(oldestId);
          }
          next.set(item.id, snapshotFromItem(item));
        }

        set({ bookmarks: next }, undefined, 'feedBookmarks/toggle');
        persist(next);
      },

      isBookmarked: (id: number) => get().bookmarks.has(id),

      clear: () => {
        const empty = new Map<number, FeedBookmarkSnapshot>();
        set({ bookmarks: empty }, undefined, 'feedBookmarks/clear');
        persist(empty);
      },
    }),
    { name: 'feed-bookmarks' }
  )
);

// Eager-load persisted bookmarks on module import so the first render has data.
void useFeedBookmarksStore.getState().load();
