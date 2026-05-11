import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Minus, Square, Copy, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IS_ELECTRON, IS_MAC } from '@/lib/platform';

/**
 * Custom title bar ("chrome") for the frameless Electron window.
 *
 * Visual language mirrors `.chrome` from the shiroani-design mocks:
 *   - 28px tall, sidebar-toned surface with a 1px glass bottom border
 *   - Centered uppercase wordmark in JetBrains Mono at 10.5px with 0.12em tracking
 *   - On macOS the native traffic lights occupy the leading edge; on Windows/Linux
 *     the real minimize/maximize/close buttons ride the trailing edge. We do NOT
 *     render decorative "fake" traffic-light dots — they would be mistaken for
 *     working window controls on non-macOS and overlap the real lights on macOS.
 *
 * Drag behaviour (`.drag` / `.no-drag`) is preserved so Electron's frameless
 * window continues to move when the user grabs the bar.
 */
export function TitleBar() {
  const { t } = useTranslation('nav');
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

  // Shared title element — centered wordmark in the chrome bar
  const title = (
    <span
      className={cn(
        'pointer-events-none absolute left-1/2 -translate-x-1/2 select-none',
        'font-mono text-[10.5px] tracking-[0.12em] text-muted-foreground uppercase'
      )}
    >
      SHIROANI
    </span>
  );

  // On macOS, the native traffic lights handle window controls; we only render
  // the chrome strip (with leading space reserved by Electron for the lights).
  if (IS_MAC) {
    return (
      <div
        className={cn(
          'drag relative h-7 shrink-0 flex items-center select-none',
          'bg-sidebar border-b border-border-glass'
        )}
      >
        {title}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'drag relative h-7 shrink-0 flex items-center select-none',
        'bg-sidebar border-b border-border-glass'
      )}
    >
      {title}

      <div className="flex-1" />

      <div className="no-drag flex items-stretch h-full">
        <button
          onClick={handleMinimize}
          className={cn(
            'w-10 flex items-center justify-center',
            'text-muted-foreground hover:bg-accent hover:text-foreground',
            'transition-colors duration-150'
          )}
          aria-label={t('titleBar.minimize')}
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleMaximize}
          className={cn(
            'w-10 flex items-center justify-center',
            'text-muted-foreground hover:bg-accent hover:text-foreground',
            'transition-colors duration-150'
          )}
          aria-label={isMaximized ? t('titleBar.restore') : t('titleBar.maximize')}
        >
          {isMaximized ? <Copy className="w-3 h-3" /> : <Square className="w-3 h-3" />}
        </button>
        <button
          onClick={handleClose}
          className={cn(
            'w-10 flex items-center justify-center',
            'text-muted-foreground hover:bg-destructive hover:text-destructive-foreground',
            'transition-colors duration-150'
          )}
          aria-label={t('titleBar.close')}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
