/**
 * Shared utilities for interacting with electron-store.
 * Provides debounced persistence and typed get/set wrappers.
 */

import { createLogger } from '@shiroani/shared';

const logger = createLogger('ElectronStore');

/**
 * Creates a debounced persist function scoped to a specific electron-store key.
 * Each call resets the timer; the actual write fires after `delayMs` of inactivity.
 */
export function createDebouncedPersist(key: string, delayMs: number = 500) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (data: unknown) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      window.electronAPI?.store?.set(key, data)?.catch((err: Error) => {
        // A key missing from ALLOWED_STORE_KEYS rejects main-side — without
        // this log the write is silently dropped and state vanishes on restart.
        logger.error(`Persist failed for '${key}':`, err.message);
      });
    }, delayMs);
  };
}

/**
 * Read a value from electron-store with type safety.
 */
export async function electronStoreGet<T>(key: string): Promise<T | undefined> {
  return window.electronAPI?.store?.get<T>(key);
}

/**
 * Write a value to electron-store.
 */
export async function electronStoreSet(key: string, value: unknown): Promise<void> {
  await window.electronAPI?.store?.set(key, value);
}

/**
 * Delete a key from electron-store.
 */
export async function electronStoreDelete(key: string): Promise<void> {
  await window.electronAPI?.store?.delete(key);
}
