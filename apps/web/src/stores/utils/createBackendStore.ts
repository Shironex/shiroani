import type { NamedSet } from 'zustand/middleware';
import { onBackendEvent } from '@/lib/backend';
import { createLogger } from '@shiroani/shared';

const logger = createLogger('BackendStore');

/**
 * Common state for stores backed by the desktop backend
 */
interface BackendStoreState {
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | null;
  /** Whether listeners are initialized */
  listenersInitialized: boolean;
}

/**
 * Common actions for stores backed by the desktop backend
 */
interface BackendStoreActions {
  /** Set loading state */
  setLoading: (isLoading: boolean) => void;
  /** Set error */
  setError: (error: string | null) => void;
}

/**
 * Combined common state and actions
 */
export type BackendStoreSlice = BackendStoreState & BackendStoreActions;

/**
 * Initial state for backend stores
 */
export const initialBackendState: BackendStoreState = {
  isLoading: false,
  error: null,
  listenersInitialized: false,
};

/**
 * Create common backend store actions
 */
export function createBackendActions<T extends BackendStoreState>(
  set: NamedSet<T>,
  storeName: string
): BackendStoreActions {
  return {
    setLoading: (isLoading: boolean) => {
      set({ isLoading } as Partial<T>, undefined, `${storeName}/setLoading`);
    },
    setError: (error: string | null) => {
      set({ error } as Partial<T>, undefined, `${storeName}/setError`);
    },
  };
}

/**
 * Backend event listener configuration
 */
interface BackendListenerConfig<T> {
  /** Event name to listen for */
  event: string;
  /** Handler function */
  handler: (data: unknown, get: () => T) => void;
}

/**
 * Options for creating backend event listeners
 */
interface CreateListenersOptions<T extends BackendStoreSlice> {
  /** Event listeners specific to this store */
  listeners: BackendListenerConfig<T>[];
}

/**
 * Create initListeners and cleanupListeners functions for a backend store
 *
 * @param get - Zustand get function
 * @param set - Zustand set function
 * @param options - Listener configuration options
 * @returns Object with initListeners and cleanupListeners functions
 */
export function createBackendListeners<T extends BackendStoreSlice>(
  get: () => T,
  set: NamedSet<T>,
  storeName: string,
  options: CreateListenersOptions<T>
): { initListeners: () => void; cleanupListeners: () => void } {
  const { listeners } = options;

  // Keep the unsubscribers so listeners do not accumulate on re-mount
  const unsubscribers: Array<() => void> = [];

  const initListeners = () => {
    const state = get();

    // Prevent duplicate listener registration
    if (state.listenersInitialized) {
      return;
    }

    for (const config of listeners) {
      logger.debug('Registering listener:', config.event);
      unsubscribers.push(
        onBackendEvent<unknown>(config.event, data => {
          config.handler(data, get);
        })
      );
    }

    set({ listenersInitialized: true } as Partial<T>, undefined, `${storeName}/initListeners`);
  };

  const cleanupListeners = () => {
    logger.debug('Cleaning up listeners');
    for (const unsubscribe of unsubscribers.splice(0)) {
      unsubscribe();
    }

    set({ listenersInitialized: false } as Partial<T>, undefined, `${storeName}/cleanupListeners`);
  };

  return { initListeners, cleanupListeners };
}
