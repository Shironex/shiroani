import { devtools, type DevtoolsOptions } from 'zustand/middleware';
import type { StateCreator, StoreMutatorIdentifier } from 'zustand';

/**
 * Wraps a store creator with Zustand devtools middleware in development only.
 * In production the creator is returned unchanged, eliminating the devtools
 * bundle overhead and action-wrapping cost from every `set()` call.
 *
 * The return type always reflects the devtools-augmented creator so that
 * 3-argument `set(state, replace, actionName)` calls remain valid TypeScript
 * in both environments — the extra argument is silently ignored at runtime
 * when devtools is absent.
 */
export function maybeDevtools<
  T,
  Mps extends [StoreMutatorIdentifier, unknown][] = [],
  Mcs extends [StoreMutatorIdentifier, unknown][] = [],
>(
  impl: StateCreator<T, [...Mps, ['zustand/devtools', never]], Mcs>,
  options?: DevtoolsOptions
): StateCreator<T, Mps, [['zustand/devtools', never], ...Mcs]> {
  if (process.env.NODE_ENV === 'production') {
    return devtools(impl, { ...options, enabled: false });
  }
  return devtools(impl, options);
}
