import { useState, useEffect, useCallback } from 'react';
import { IS_ELECTRON } from '@/lib/platform';
import type { ITitleBarView } from './TitleBar.types';

export function useTitleBar(): ITitleBarView {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (!IS_ELECTRON) return;

    // Fetch initial state
    window.electronAPI?.window.isMaximized().then(setIsMaximized);

    // Listen for changes
    const cleanup = window.electronAPI?.window.onMaximizedChange(setIsMaximized);
    return cleanup;
  }, []);

  const handleMinimize = useCallback(() => {
    window.electronAPI?.window.minimize();
  }, []);

  const handleMaximize = useCallback(() => {
    window.electronAPI?.window.maximize();
  }, []);

  const handleClose = useCallback(() => {
    window.electronAPI?.window.close();
  }, []);

  return { isMaximized, handleMinimize, handleMaximize, handleClose };
}
