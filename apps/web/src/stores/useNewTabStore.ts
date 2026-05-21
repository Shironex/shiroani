import { create } from 'zustand';
import { maybeDevtools } from '@/stores/utils/maybeDevtools';
import { createLogger } from '@shiroani/shared';
import { IS_ELECTRON } from '@/lib/platform';
import { electronStoreGet, createDebouncedPersist } from '@/lib/electron-store';
import { reconcileOrder } from '@/lib/nav-items';
import { arrayMove } from '@dnd-kit/sortable';

const logger = createLogger('NewTab');

/** Reorderable panels on the browser New Tab page, in default top→bottom order. */
export type NewTabPanelId = 'greeting' | 'airing' | 'quickAccess' | 'recents' | 'resume';

const DEFAULT_PANEL_ORDER: NewTabPanelId[] = [
  'greeting',
  'airing',
  'quickAccess',
  'recents',
  'resume',
];
const DEFAULT_HIDDEN_PANELS: NewTabPanelId[] = []; // all visible
const DEFAULT_SHOW_WATERMARK = true;
const DEFAULT_SHOW_GREETING_NAME = true;
const DEFAULT_AIRING_COUNT = 12; // mirrors the previous hardcoded MAX_AIRING_CARDS

/** Clamp bounds for the airing-today card count slider. */
export const AIRING_COUNT_MIN = 6;
export const AIRING_COUNT_MAX = 20;

const STORE_KEY = 'newtab-settings';

const persistSettings = createDebouncedPersist(STORE_KEY, 300);

interface NewTabSettings {
  /** Panel ids the user has hidden. */
  hiddenPanels: NewTabPanelId[];
  /** Panel ids in user-chosen display order. Always contains every panel id. */
  order: NewTabPanelId[];
  /** Whether the decorative kanji watermark is shown. */
  showWatermark: boolean;
  /** Whether the display name is appended to the greeting. */
  showGreetingName: boolean;
  /** Maximum number of "Airing today" cards to show. */
  airingCount: number;
}

interface NewTabState extends NewTabSettings {
  /** Whether settings have been restored from persistence. */
  initialized: boolean;
}

interface NewTabActions {
  /** Toggle a panel's visibility on the new tab page. */
  togglePanel: (id: NewTabPanelId) => void;
  /** Reorder panels by moving the dragged id to the position of the id it was dropped on. */
  reorderPanels: (activeId: NewTabPanelId, overId: NewTabPanelId) => void;
  setShowWatermark: (value: boolean) => void;
  setShowGreetingName: (value: boolean) => void;
  setAiringCount: (value: number) => void;
  /** Restore the default panel order, visibility and customization values. */
  resetNewTab: () => void;
  /** Initialize from persisted settings. */
  initNewTab: () => Promise<void>;
}

type NewTabStore = NewTabState & NewTabActions;

/**
 * Reconcile a (possibly stale) saved order against the current panel set so
 * panels added in a future version never vanish. See {@link reconcileOrder}.
 */
function sanitizePanelOrder(saved: unknown): NewTabPanelId[] {
  return reconcileOrder(saved, DEFAULT_PANEL_ORDER);
}

function clampAiringCount(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_AIRING_COUNT;
  return Math.max(AIRING_COUNT_MIN, Math.min(AIRING_COUNT_MAX, Math.round(value)));
}

function persistCurrentSettings(state: NewTabState) {
  if (!IS_ELECTRON) return;
  const settings: NewTabSettings = {
    hiddenPanels: state.hiddenPanels,
    order: state.order,
    showWatermark: state.showWatermark,
    showGreetingName: state.showGreetingName,
    airingCount: state.airingCount,
  };
  persistSettings(settings);
}

export const useNewTabStore = create<NewTabStore>()(
  maybeDevtools(
    (set, get) => ({
      // State
      hiddenPanels: DEFAULT_HIDDEN_PANELS,
      order: DEFAULT_PANEL_ORDER,
      showWatermark: DEFAULT_SHOW_WATERMARK,
      showGreetingName: DEFAULT_SHOW_GREETING_NAME,
      airingCount: DEFAULT_AIRING_COUNT,
      initialized: false,

      // Actions
      togglePanel: (id: NewTabPanelId) => {
        const { hiddenPanels } = get();
        const isHidden = hiddenPanels.includes(id);
        const nextHidden = isHidden ? hiddenPanels.filter(p => p !== id) : [...hiddenPanels, id];
        set({ hiddenPanels: nextHidden }, undefined, 'newtab/togglePanel');
        persistCurrentSettings(get());
      },

      reorderPanels: (activeId: NewTabPanelId, overId: NewTabPanelId) => {
        const { order } = get();
        const oldIndex = order.indexOf(activeId);
        const newIndex = order.indexOf(overId);
        if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

        const reordered = arrayMove(order, oldIndex, newIndex);
        set({ order: reordered }, undefined, 'newtab/reorderPanels');
        persistCurrentSettings(get());
      },

      setShowWatermark: (value: boolean) => {
        set({ showWatermark: value }, undefined, 'newtab/setShowWatermark');
        persistCurrentSettings(get());
      },

      setShowGreetingName: (value: boolean) => {
        set({ showGreetingName: value }, undefined, 'newtab/setShowGreetingName');
        persistCurrentSettings(get());
      },

      setAiringCount: (value: number) => {
        set({ airingCount: clampAiringCount(value) }, undefined, 'newtab/setAiringCount');
        persistCurrentSettings(get());
      },

      resetNewTab: () => {
        set(
          {
            order: DEFAULT_PANEL_ORDER,
            hiddenPanels: DEFAULT_HIDDEN_PANELS,
            showWatermark: DEFAULT_SHOW_WATERMARK,
            showGreetingName: DEFAULT_SHOW_GREETING_NAME,
            airingCount: DEFAULT_AIRING_COUNT,
          },
          undefined,
          'newtab/resetNewTab'
        );
        persistCurrentSettings(get());
      },

      initNewTab: async () => {
        if (!IS_ELECTRON) {
          set({ initialized: true }, undefined, 'newtab/initNewTab');
          return;
        }
        try {
          const saved = await electronStoreGet<NewTabSettings>(STORE_KEY);
          if (saved) {
            logger.debug('Restored new tab settings:', saved);
            set(
              {
                hiddenPanels: Array.isArray(saved.hiddenPanels)
                  ? saved.hiddenPanels.filter(p => DEFAULT_PANEL_ORDER.includes(p))
                  : DEFAULT_HIDDEN_PANELS,
                // Reconcile the saved order with the current panel set: unknown
                // ids are dropped and panels added in a newer version are
                // appended, so a stale order never makes a panel disappear.
                order: sanitizePanelOrder(saved.order),
                showWatermark: saved.showWatermark ?? DEFAULT_SHOW_WATERMARK,
                showGreetingName: saved.showGreetingName ?? DEFAULT_SHOW_GREETING_NAME,
                airingCount:
                  saved.airingCount != null
                    ? clampAiringCount(saved.airingCount)
                    : DEFAULT_AIRING_COUNT,
                initialized: true,
              },
              undefined,
              'newtab/initNewTab'
            );
          } else {
            set({ initialized: true }, undefined, 'newtab/initNewTab');
          }
        } catch (err) {
          logger.error('Failed to restore new tab settings:', err);
          set({ initialized: true }, undefined, 'newtab/initNewTab');
        }
      },
    }),
    { name: 'newtab' }
  )
);
