import { useCallback, useMemo, useRef, useState, type KeyboardEvent, type RefObject } from 'react';
import { useBrowserStore } from '@/stores/useBrowserStore';
import { useAddressSuggestions } from '@/components/browser/useAddressSuggestions';
import type { IBrowserToolbarView } from './BrowserToolbar.types';

export function useBrowserToolbar(
  urlInput: string,
  committedUrl: string,
  onUrlInputChange: (value: string) => void,
  onNavigate: (url: string) => void,
  externalUrlInputRef: RefObject<HTMLInputElement | null> | undefined
): IBrowserToolbarView {
  const internalUrlInputRef = useRef<HTMLInputElement>(null);
  const urlInputRef = externalUrlInputRef ?? internalUrlInputRef;

  // Smart address bar: suggestions are matched against the live input value.
  const suggestions = useAddressSuggestions(urlInput);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const showSuggestions = isOpen && suggestions.length > 0;
  const activeOptionId =
    showSuggestions && activeIndex >= 0 ? suggestions[activeIndex]?.id : undefined;

  const closeSuggestions = useCallback(() => {
    setIsOpen(false);
    setActiveIndex(-1);
  }, []);

  const commitNavigation = useCallback(
    (url: string) => {
      const target = url.trim();
      if (!target) return;
      onNavigate(target);
      closeSuggestions();
      urlInputRef?.current?.blur();
    },
    [onNavigate, closeSuggestions, urlInputRef]
  );

  const handleUrlSubmit = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      // Arrow keys move the active suggestion; Enter accepts it (or the raw
      // input); Escape dismisses the dropdown without navigating.
      if (showSuggestions && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        e.preventDefault();
        setActiveIndex(prev => {
          const len = suggestions.length;
          if (e.key === 'ArrowDown') return prev + 1 >= len ? 0 : prev + 1;
          return prev - 1 < 0 ? len - 1 : prev - 1;
        });
        return;
      }
      if (e.key === 'Enter') {
        if (showSuggestions && activeIndex >= 0 && suggestions[activeIndex]) {
          e.preventDefault();
          commitNavigation(suggestions[activeIndex].url);
          return;
        }
        if (urlInput.trim()) commitNavigation(urlInput);
        return;
      }
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        closeSuggestions();
      }
    },
    [
      showSuggestions,
      suggestions,
      activeIndex,
      urlInput,
      isOpen,
      commitNavigation,
      closeSuggestions,
    ]
  );

  const handleUrlChange = useCallback(
    (value: string) => {
      onUrlInputChange(value);
      setIsOpen(true);
      setActiveIndex(-1);
    },
    [onUrlInputChange]
  );

  const handleUrlFocus = useCallback(() => {
    useBrowserStore.getState().setAddressBarFocused(true);
    setIsOpen(true);
    urlInputRef?.current?.select();
  }, [urlInputRef]);

  const handleUrlBlur = useCallback(() => {
    useBrowserStore.getState().setAddressBarFocused(false);
    // AddressSuggestions commits a row on onMouseDown + preventDefault, so the
    // selection lands before blur fires; closeSuggestions() then unmounts the
    // list synchronously here.
    closeSuggestions();
  }, [closeSuggestions]);

  const handleSuggestionSelect = useCallback(
    (url: string) => {
      commitNavigation(url);
    },
    [commitNavigation]
  );

  // Secure-lock reflects the *committed* pane URL, not the typed draft: show the
  // neutral globe until navigation to an https:// page has actually landed, so a
  // half-typed "https://…" never falsely implies a verified secure connection.
  const isSecure = useMemo(() => committedUrl.trim().startsWith('https://'), [committedUrl]);

  return {
    urlInputRef,
    suggestions,
    showSuggestions,
    activeIndex,
    setActiveIndex,
    activeOptionId,
    isSecure,
    handleUrlSubmit,
    handleUrlChange,
    handleUrlFocus,
    handleUrlBlur,
    handleSuggestionSelect,
  };
}
