import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useBrowserStore } from '@/stores/useBrowserStore';
import { useQuickAccessStore } from '@/stores/useQuickAccessStore';
import { PREDEFINED_SITES } from '@/lib/quick-access-defaults';

export type AddressSuggestionSource = 'history' | 'bookmark' | 'frequent';

export interface AddressSuggestion {
  /** Unique id for aria-activedescendant wiring. */
  id: string;
  url: string;
  title: string;
  favicon?: string;
  source: AddressSuggestionSource;
}

const MAX_SUGGESTIONS = 8;

/**
 * Match query against url + title, case-insensitively. Empty query → no match
 * (suggestions only appear once the user starts typing).
 */
function matches(query: string, url: string, title: string): boolean {
  if (!query) return false;
  const q = query.toLowerCase();
  return url.toLowerCase().includes(q) || title.toLowerCase().includes(q);
}

/**
 * Build address-bar suggestions from browsing history, quick-access bookmarks
 * (predefined + custom) and frequently-visited sites, matched against the
 * current query and deduped by URL. History is preferred, then bookmarks, then
 * frequent — the first occurrence of a URL wins so its source label is stable.
 */
export function useAddressSuggestions(query: string): AddressSuggestion[] {
  const history = useBrowserStore(useShallow(s => s.history));
  const { customSites, frequentSites, hiddenPredefinedIds } = useQuickAccessStore(
    useShallow(s => ({
      customSites: s.sites,
      frequentSites: s.frequentSites,
      hiddenPredefinedIds: s.hiddenPredefinedIds,
    }))
  );

  return useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return [];

    const seen = new Set<string>();
    const out: AddressSuggestion[] = [];

    const push = (
      url: string,
      title: string,
      source: AddressSuggestionSource,
      favicon?: string
    ) => {
      if (out.length >= MAX_SUGGESTIONS) return;
      if (seen.has(url)) return;
      if (!matches(trimmed, url, title)) return;
      seen.add(url);
      out.push({ id: `addr-sug-${source}-${out.length}`, url, title, favicon, source });
    };

    // 1. History (newest first — already ordered).
    for (const h of history) push(h.url, h.title, 'history', h.favicon);

    // 2. Bookmarks: visible predefined + custom.
    const bookmarks = [
      ...PREDEFINED_SITES.filter(s => !hiddenPredefinedIds.includes(s.id)),
      ...customSites,
    ];
    for (const b of bookmarks) push(b.url, b.name, 'bookmark', b.icon);

    // 3. Frequently-visited.
    for (const f of frequentSites) push(f.url, f.title, 'frequent', f.favicon);

    return out;
  }, [query, history, customSites, frequentSites, hiddenPredefinedIds]);
}
