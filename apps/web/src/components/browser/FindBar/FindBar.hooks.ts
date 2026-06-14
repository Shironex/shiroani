import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { getWebview, type WebviewElement } from '../webviewRefs';
import type { IFindBarView, IFoundInPageEvent } from './FindBar.types';

export function useFindBar(activePaneId: string | null, onClose: () => void): IFindBarView {
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
      const { result } = e as IFoundInPageEvent;
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

  return {
    inputRef,
    query,
    matches,
    activeMatch,
    hasQuery,
    onQueryChange: handleQueryChange,
    onNext: handleNext,
    onPrev: handlePrev,
    onCloseBar: handleClose,
    onKeyDown: handleKeyDown,
  };
}
