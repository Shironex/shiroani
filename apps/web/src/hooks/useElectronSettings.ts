import { useState, useEffect, useCallback, useRef } from 'react';

interface UseElectronSettingsOptions<T> {
  load: () => Promise<T | undefined>;
  save: (data: T) => Promise<void>;
  defaultValue: T;
}

interface UseElectronSettingsReturn<T> {
  data: T;
  setData: React.Dispatch<React.SetStateAction<T>>;
  loaded: boolean;
  saved: boolean;
  save: () => Promise<void>;
  update: (partial: Partial<T>) => void;
}

export function useElectronSettings<T extends object>(
  options: UseElectronSettingsOptions<T>
): UseElectronSettingsReturn<T> {
  const [data, setData] = useState<T>(options.defaultValue);
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stable refs for options to avoid re-running the effect
  const loadRef = useRef(options.load);
  loadRef.current = options.load;

  const saveRef = useRef(options.save);
  saveRef.current = options.save;

  useEffect(() => {
    let mounted = true;
    loadRef.current().then(result => {
      if (!mounted) return;
      if (result !== undefined) {
        setData(result);
      }
      setLoaded(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const update = useCallback((partial: Partial<T>) => {
    setData(prev => ({ ...prev, ...partial }));
  }, []);

  const save = useCallback(async () => {
    await saveRef.current(data);
    setSaved(true);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setSaved(false), 2000);
  }, [data]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  return { data, setData, loaded, saved, save, update };
}
