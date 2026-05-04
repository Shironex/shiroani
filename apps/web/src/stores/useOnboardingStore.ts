import { create } from 'zustand';
import { maybeDevtools } from '@/stores/utils/maybeDevtools';
import { createLogger } from '@shiroani/shared';
import { electronStoreGet, electronStoreSet, electronStoreDelete } from '@/lib/electron-store';

const logger = createLogger('OnboardingStore');

const STORAGE_KEY = 'onboarding-completed';

interface OnboardingState {
  /** Whether the user has completed onboarding */
  completed: boolean;
  /** Mark onboarding as completed */
  setCompleted: () => void;
  /** Reset onboarding so it shows again */
  reset: () => void;
  /** Hydrate from electron-store (source of truth) */
  initOnboarding: () => Promise<void>;
}

function getPersistedValue(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch (err) {
    logger.warn('useOnboardingStore: failed to read persisted onboarding flag', err);
    return false;
  }
}

export const useOnboardingStore = create<OnboardingState>()(
  maybeDevtools(
    set => ({
      completed: getPersistedValue(),

      setCompleted: () => {
        set({ completed: true }, undefined, 'onboarding/setCompleted');
        try {
          localStorage.setItem(STORAGE_KEY, 'true');
        } catch (err) {
          // Storage unavailable — state still in memory
          logger.warn('useOnboardingStore: failed to persist setCompleted to localStorage', err);
        }
        void electronStoreSet(STORAGE_KEY, true).catch(err => {
          logger.warn('useOnboardingStore: failed to persist setCompleted to electron-store', err);
        });
      },

      reset: () => {
        set({ completed: false }, undefined, 'onboarding/reset');
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch (err) {
          // Storage unavailable
          logger.warn('useOnboardingStore: failed to clear onboarding flag from localStorage', err);
        }
        void electronStoreDelete(STORAGE_KEY).catch(err => {
          logger.warn(
            'useOnboardingStore: failed to clear onboarding flag from electron-store',
            err
          );
        });
      },

      initOnboarding: async () => {
        let persisted: boolean | undefined;
        try {
          persisted = await electronStoreGet<boolean>(STORAGE_KEY);
        } catch (err) {
          logger.warn(
            'useOnboardingStore: failed to load onboarding flag from electron-store',
            err
          );
          return;
        }
        if (persisted === true) {
          set({ completed: true }, undefined, 'onboarding/hydrate');
          try {
            localStorage.setItem(STORAGE_KEY, 'true');
          } catch (err) {
            // keep localStorage in sync
            logger.warn(
              'useOnboardingStore: failed to mirror onboarding flag to localStorage',
              err
            );
          }
        }
      },
    }),
    { name: 'onboarding' }
  )
);
