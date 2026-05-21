import { useEffect, useRef } from 'react';

/**
 * Returns a stable getter that reports whether the component is still mounted.
 *
 * Replaces the `let mounted = true; … return () => { mounted = false }`
 * boilerplate used to guard `setState` calls in async effects. The flag is set
 * `true` on every effect run and `false` on cleanup, so it stays correct under
 * React Strict Mode's mount → unmount → mount double-invoke (the final mount
 * leaves it `true`, matching the per-effect local-variable pattern).
 */
export function useMountedRef(): () => boolean {
  const mountedRef = useRef(false);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  const getter = useRef(() => mountedRef.current);
  return getter.current;
}
