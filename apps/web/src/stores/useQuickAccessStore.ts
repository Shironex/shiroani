import { create } from 'zustand';
import { maybeDevtools } from '@/stores/utils/maybeDevtools';
import { createLogger, isNewTabUrl } from '@shiroani/shared';
import type { QuickAccessSite, FrequentSite } from '@shiroani/shared';
import { PREDEFINED_SITES } from '@/lib/quick-access-defaults';
import {
  createDebouncedPersist,
  electronStoreGet,
  electronStoreDelete,
} from '@/lib/electron-store';

const logger = createLogger('QuickAccessStore');

const SITES_STORE_KEY = 'quick-access-sites';
const FREQUENT_STORE_KEY = 'quick-access-frequent';
const MAX_FREQUENT_SITES = 8;

interface QuickAccessState {
  /** Custom sites added by the user */
  sites: QuickAccessSite[];
  /** IDs of predefined sites the user has hidden */
  hiddenPredefinedIds: string[];
  /** Frequently visited sites tracked automatically */
  frequentSites: FrequentSite[];
  /** Whether to track browsing history (frequent sites). */
  trackFrequentSites: boolean;
  /** Whether the store has been loaded from persistence */
  loaded: boolean;
}

interface QuickAccessActions {
  addSite: (site: Omit<QuickAccessSite, 'id'>) => void;
  removeSite: (id: string) => void;
  hidePredefined: (id: string) => void;
  showPredefined: (id: string) => void;
  recordVisit: (url: string, title: string, favicon?: string) => void;
  setTrackFrequentSites: (enabled: boolean) => void;
  loadSites: () => Promise<void>;
  persistSites: () => void;
  persistFrequent: () => void;
  /** Get all visible sites: visible predefined + custom */
  getVisibleSites: () => QuickAccessSite[];
}

type QuickAccessStore = QuickAccessState & QuickAccessActions;

const debouncedPersistSites = createDebouncedPersist(SITES_STORE_KEY);
const debouncedPersistFrequent = createDebouncedPersist(FREQUENT_STORE_KEY);

export const useQuickAccessStore = create<QuickAccessStore>()(
  maybeDevtools(
    (set, get) => ({
      // State
      sites: [],
      hiddenPredefinedIds: [],
      frequentSites: [],
      trackFrequentSites: true,
      loaded: false,

      // Actions

      addSite: site => {
        const newSite: QuickAccessSite = {
          ...site,
          id: `custom-${crypto.randomUUID()}`,
        };
        set(state => ({ sites: [...state.sites, newSite] }), undefined, 'quickAccess/addSite');
        get().persistSites();
        logger.debug(`Added custom site: ${newSite.name}`);
      },

      removeSite: id => {
        set(
          state => ({ sites: state.sites.filter(s => s.id !== id) }),
          undefined,
          'quickAccess/removeSite'
        );
        get().persistSites();
        logger.debug(`Removed site: ${id}`);
      },

      hidePredefined: id => {
        set(
          state => ({
            hiddenPredefinedIds: [...state.hiddenPredefinedIds, id],
          }),
          undefined,
          'quickAccess/hidePredefined'
        );
        get().persistSites();
        logger.debug(`Hidden predefined: ${id}`);
      },

      showPredefined: id => {
        set(
          state => ({
            hiddenPredefinedIds: state.hiddenPredefinedIds.filter(hid => hid !== id),
          }),
          undefined,
          'quickAccess/showPredefined'
        );
        get().persistSites();
        logger.debug(`Shown predefined: ${id}`);
      },

      recordVisit: (url, title, favicon) => {
        // Respect the user's history-tracking toggle
        if (!get().trackFrequentSites) return;
        // Don't track internal URLs
        if (isNewTabUrl(url) || url === 'about:blank') return;

        // Normalize URL to origin+path (strip query/hash for grouping)
        let normalizedUrl: string;
        try {
          const parsed = new URL(url);
          normalizedUrl = `${parsed.origin}${parsed.pathname}`;
        } catch {
          normalizedUrl = url;
        }

        set(
          state => {
            const existing = state.frequentSites.find(s => s.url === normalizedUrl);
            let updated: FrequentSite[];

            if (existing) {
              updated = state.frequentSites.map(s =>
                s.url === normalizedUrl
                  ? {
                      ...s,
                      title: title || s.title,
                      favicon: favicon || s.favicon,
                      visitCount: s.visitCount + 1,
                      lastVisited: Date.now(),
                    }
                  : s
              );
            } else {
              updated = [
                ...state.frequentSites,
                {
                  url: normalizedUrl,
                  title: title || normalizedUrl,
                  favicon,
                  visitCount: 1,
                  lastVisited: Date.now(),
                },
              ];
            }

            // Sort by visit count (desc), keep top N
            updated.sort((a, b) => b.visitCount - a.visitCount);
            updated = updated.slice(0, MAX_FREQUENT_SITES);

            return { frequentSites: updated };
          },
          undefined,
          'quickAccess/recordVisit'
        );
        get().persistFrequent();
      },

      setTrackFrequentSites: enabled => {
        set(
          state => ({
            trackFrequentSites: enabled,
            // Silently wipe accumulated history when the user opts out.
            frequentSites: enabled ? state.frequentSites : [],
          }),
          undefined,
          'quickAccess/setTrackFrequentSites'
        );
        get().persistSites();
        if (!enabled) {
          electronStoreDelete(FREQUENT_STORE_KEY);
        }
      },

      loadSites: async () => {
        try {
          const saved = await electronStoreGet<{
            sites: QuickAccessSite[];
            hiddenPredefinedIds: string[];
            trackFrequentSites?: boolean;
          }>(SITES_STORE_KEY);

          const trackingEnabled = saved?.trackFrequentSites !== false;
          const frequent = trackingEnabled
            ? await electronStoreGet<FrequentSite[]>(FREQUENT_STORE_KEY)
            : null;

          set(
            {
              sites: saved?.sites ?? [],
              hiddenPredefinedIds: saved?.hiddenPredefinedIds ?? [],
              frequentSites: frequent ?? [],
              trackFrequentSites: trackingEnabled,
              loaded: true,
            },
            undefined,
            'quickAccess/load'
          );

          logger.debug('Quick access data loaded');
        } catch (err) {
          logger.warn('Failed to load quick access data:', err);
          set({ loaded: true }, undefined, 'quickAccess/load:error');
        }
      },

      persistSites: () => {
        const { sites, hiddenPredefinedIds, trackFrequentSites } = get();
        debouncedPersistSites({ sites, hiddenPredefinedIds, trackFrequentSites });
        logger.debug('Persisted quick access sites');
      },

      persistFrequent: () => {
        const { frequentSites } = get();
        debouncedPersistFrequent(frequentSites);
        logger.debug('Persisted frequent sites');
      },

      getVisibleSites: () => {
        const { sites, hiddenPredefinedIds } = get();
        const visiblePredefined = PREDEFINED_SITES.filter(s => !hiddenPredefinedIds.includes(s.id));
        return [...visiblePredefined, ...sites];
      },
    }),
    { name: 'quick-access' }
  )
);
