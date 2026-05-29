import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { TooltipButton } from '@/components/ui/tooltip-button';
import { getWebview, type FoundInPageResult, type WebviewElement } from './webviewRefs';

interface FindBarProps {
  /** Pane id of the active webview to search within. */
  activePaneId: string | null;
  /** Close the bar (clears highlights). */
  onClose: () => void;
}

interface FoundInPageEvent extends Event {
  result: FoundInPageResult;
}

/**
 * In-page search bar (Ctrl+F). Drives the active <webview>'s findInPage /
 * stopFindInPage and renders the live match count from the `found-in-page`
 * event. Mounts only while find mode is active, so it never disturbs the
 * toolbar's button order. Esc closes; Enter / Shift+Enter step matches.
 */
export function FindBar({ activePaneId, onClose }: FindBarProps) {
  const { t } = useTranslation('browser');
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState(0);
  const [activeMatch, setActiveMatch] = useState(0);

  const getActiveWebview = useCallback((): WebviewElement | undefined => {
    return activePaneId ? getWebview(activePaneId) : undefined;
  }, [activePaneId]);

  // Focus + select on open so the user can type immediately.
  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  // Listen for match-count updates from the active webview.
  useEffect(() => {
    const webview = getActiveWebview();
    if (!webview) return;
    const onFound = (e: Event) => {
      const { result } = e as FoundInPageEvent;
      if (!result.finalUpdate) return;
      setMatches(result.matches);
      setActiveMatch(result.activeMatchOrdinal);
    };
    webview.addEventListener('found-in-page', onFound);
    return () => webview.removeEventListener('found-in-page', onFound);
  }, [getActiveWebview]);

  const runSearch = useCallback(
    (text: string, findNext: boolean, forward = true) => {
      const webview = getActiveWebview();
      if (!webview) return;
      if (text) {
        webview.findInPage(text, { findNext, forward });
      } else {
        webview.stopFindInPage('clearSelection');
        setMatches(0);
        setActiveMatch(0);
      }
    },
    [getActiveWebview]
  );

  const handleQueryChange = useCallback(
    (value: string) => {
      setQuery(value);
      // Fresh search on every keystroke (findNext: false starts from the top).
      runSearch(value, false);
    },
    [runSearch]
  );

  const handleNext = useCallback(() => {
    if (query) runSearch(query, true, true);
  }, [query, runSearch]);

  const handlePrev = useCallback(() => {
    if (query) runSearch(query, true, false);
  }, [query, runSearch]);

  const handleClose = useCallback(() => {
    getActiveWebview()?.stopFindInPage('clearSelection');
    onClose();
  }, [getActiveWebview, onClose]);

  const handleKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (e.shiftKey) handlePrev();
        else handleNext();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    },
    [handleNext, handlePrev, handleClose]
  );

  const hasQuery = query.length > 0;

  return (
    <div
      role="search"
      className={cn(
        'flex items-center h-[42px] px-3 gap-2 shrink-0',
        'bg-[oklch(from_var(--card)_l_c_h/0.6)] border-b border-border-glass'
      )}
    >
      <div
        className={cn(
          'flex-1 min-w-0 max-w-md h-8 flex items-center gap-2 rounded-full px-3',
          'bg-foreground/[0.05] border border-border-glass',
          'focus-within:border-primary/50 transition-colors'
        )}
      >
        <Input
          ref={inputRef}
          value={query}
          onChange={e => handleQueryChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('find.placeholder')}
          aria-label={t('find.ariaLabel')}
          className={cn(
            'h-6 min-w-0 flex-1 px-0 text-[12.5px]',
            'bg-transparent border-0 rounded-none',
            'focus-visible:ring-0 focus-visible:border-0 focus-visible:bg-transparent'
          )}
        />
        <span
          aria-live="polite"
          className="shrink-0 text-[11px] tabular-nums text-muted-foreground/80"
        >
          {hasQuery ? t('find.count', { current: activeMatch, total: matches }) : ''}
        </span>
      </div>

      <TooltipButton
        variant="ghost"
        size="icon"
        className="size-[30px] rounded-full bg-foreground/[0.03] border border-border-glass disabled:opacity-40"
        onClick={handlePrev}
        disabled={matches === 0}
        tooltip={t('find.previous')}
        tooltipSide="bottom"
      >
        <ChevronUp className="w-4 h-4" />
      </TooltipButton>
      <TooltipButton
        variant="ghost"
        size="icon"
        className="size-[30px] rounded-full bg-foreground/[0.03] border border-border-glass disabled:opacity-40"
        onClick={handleNext}
        disabled={matches === 0}
        tooltip={t('find.next')}
        tooltipSide="bottom"
      >
        <ChevronDown className="w-4 h-4" />
      </TooltipButton>
      <TooltipButton
        variant="ghost"
        size="icon"
        className="size-[30px] rounded-full text-muted-foreground hover:text-foreground"
        onClick={handleClose}
        tooltip={t('find.close')}
        tooltipSide="bottom"
      >
        <X className="w-4 h-4" />
      </TooltipButton>
    </div>
  );
}
