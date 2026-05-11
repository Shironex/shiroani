import { devtools, type DevtoolsOptions } from 'zustand/middleware';
import type { StateCreator, StoreMutatorIdentifier } from 'zustand';

/**
 * Wraps a store creator with Zustand devtools middleware.
 * In production, passes `enabled: false` to make the dev-only intent explicit
 * at the call site — zustand's devtools middleware already no-ops in production
 * builds on its own (MODE check), so this is a clarity/consistency change, not
 * a runtime perf win or leak fix.
 *
 * The return type always reflects the devtools-augmented creator so that
 * 3-argument `set(state, replace, actionName)` calls remain valid TypeScript
 * in both environments.
 */
export function maybeDevtools<
  T,
  Mps extends [StoreMutatorIdentifier, unknown][] = [],
  Mcs extends [StoreMutatorIdentifier, unknown][] = [],
>(
  impl: StateCreator<T, [...Mps, ['zustand/devtools', never]], Mcs>,
  options?: DevtoolsOptions
): StateCreator<T, Mps, [['zustand/devtools', never], ...Mcs]> {
  if (import.meta.env.PROD) {
    return devtools(impl, { ...options, enabled: false });
  }
  return devtools(impl, options);
}
