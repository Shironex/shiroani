import { useEffect, useState } from 'react';
import { useMountedRef } from './useMountedRef';

/**
 * Fetch the app version from the Electron main process once on mount.
 *
 * Returns `initial` until the IPC call resolves; only adopts the fetched value
 * when it is truthy and the component is still mounted. The `initial` value
 * also fixes the returned type, so callers wanting `string | null` pass `null`
 * and those wanting a plain `string` pass `''`.
 */
export function useAppVersion<T extends string | null>(initial: T): string | T {
  const [version, setVersion] = useState<string | T>(initial);
  const isMounted = useMountedRef();

  useEffect(() => {
    window.electronAPI?.app?.getVersion().then(
      v => {
        if (isMounted() && v) setVersion(v);
      },
      () => {
        // IPC failure is benign — the version simply stays at `initial`.
      }
    );
  }, [isMounted]);

  return version;
}
