import { create } from 'zustand';
import { maybeDevtools } from '@/stores/utils/maybeDevtools';
import { createLogger } from '@shiroani/shared';
import { electronStoreGet, electronStoreSet, electronStoreDelete } from '@/lib/electron-store';

const logger = createLogger('SupportBannerStore');

const STORAGE_KEY = 'support-banner-seen';

interface SupportBannerState {
  /** Whether the user has already seen (and dismissed) the support launch banner */
  seen: boolean;
  /** Mark the support banner as seen so it never shows again */
  setSeen: () => void;
  /** Reset so the banner shows again (used by dev/diagnostics) */
  reset: () => void;
  /** Hydrate from electron-store (source of truth) */
  initSupportBanner: () => Promise<void>;
}

function getPersistedValue(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch (err) {
    logger.warn('useSupportBannerStore: failed to read persisted support banner flag', err);
    return false;
  }
}

export const useSupportBannerStore = create<SupportBannerState>()(
  maybeDevtools(
    set => ({
      seen: getPersistedValue(),

      setSeen: () => {
        set({ seen: true }, undefined, 'supportBanner/setSeen');
        try {
          localStorage.setItem(STORAGE_KEY, 'true');
        } catch (err) {
          // Storage unavailable — state still in memory
          logger.warn('useSupportBannerStore: failed to persist setSeen to localStorage', err);
        }
        void electronStoreSet(STORAGE_KEY, true).catch(err => {
          logger.warn('useSupportBannerStore: failed to persist setSeen to electron-store', err);
        });
      },

      reset: () => {
        set({ seen: false }, undefined, 'supportBanner/reset');
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch (err) {
          // Storage unavailable
          logger.warn(
            'useSupportBannerStore: failed to clear support banner flag from localStorage',
            err
          );
        }
        void electronStoreDelete(STORAGE_KEY).catch(err => {
          logger.warn(
            'useSupportBannerStore: failed to clear support banner flag from electron-store',
            err
          );
        });
      },

      initSupportBanner: async () => {
        let persisted: boolean | undefined;
        try {
          persisted = await electronStoreGet<boolean>(STORAGE_KEY);
        } catch (err) {
          logger.warn(
            'useSupportBannerStore: failed to load support banner flag from electron-store',
            err
          );
          return;
        }
        if (persisted === true) {
          set({ seen: true }, undefined, 'supportBanner/hydrate');
          try {
            localStorage.setItem(STORAGE_KEY, 'true');
          } catch (err) {
            // keep localStorage in sync
            logger.warn(
              'useSupportBannerStore: failed to mirror support banner flag to localStorage',
              err
            );
          }
        }
      },
    }),
    { name: 'supportBanner' }
  )
);
