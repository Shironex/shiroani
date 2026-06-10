import { useCallback, useMemo, useRef, useState, type KeyboardEvent, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Home,
  Loader2,
  BookmarkPlus,
  History,
  Lock,
  Globe2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { TooltipButton } from '@/components/ui/tooltip-button';
import { useBrowserStore } from '@/stores/useBrowserStore';
import { AddressSuggestions } from '@/components/browser/AddressSuggestions';
import { useAddressSuggestions } from '@/components/browser/useAddressSuggestions';

interface BrowserToolbarProps {
  urlInput: string;
  onUrlInputChange: (value: string) => void;
  canGoBack: boolean;
  canGoForward: boolean;
  isLoading: boolean;
  hasActiveTab: boolean;
  onGoBack: () => void;
  onGoForward: () => void;
  onReload: () => void;
  onNavigate: (url: string) => void;
  onGoHome: () => void;
  onAddToLibrary: () => void;
  onOpenHistory: () => void;
  urlInputRef?: RefObject<HTMLInputElement | null>;
}

const LISTBOX_ID = 'browser-address-suggestions';

/**
 * Browser URL/navigation row (Browser.html `.urlbar`):
 *  - Back / Forward / Reload icon buttons (`.nav-btns .b`)
 *  - URL input styled as a glass pill with lock/globe leading icon
 *  - Trailing cluster: add-to-library / home
 *
 * Adblock and popup-blocker toggles now live in Settings → Przeglądarka.
 *
 * Preserves button order expected by BrowserToolbar.test.tsx:
 *   0 back · 1 forward · 2 reload · 3 add-to-library · 4 home
 */
export function BrowserToolbar({
  urlInput,
  onUrlInputChange,
  canGoBack,
  canGoForward,
  isLoading,
  hasActiveTab,
  onGoBack,
  onGoForward,
  onReload,
  onNavigate,
  onGoHome,
  onAddToLibrary,
  onOpenHistory,
  urlInputRef: externalUrlInputRef,
}: BrowserToolbarProps) {
  const { t } = useTranslation('browser');
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

  const isSecure = useMemo(() => {
    const val = urlInput.trim();
    if (!val) return false;
    if (val.startsWith('https://')) return true;
    // Protocol-less bare hostnames default to https on submit, treat as secure preview
    if (!val.includes('://') && !val.startsWith('http://')) return true;
    return false;
  }, [urlInput]);

  return (
    <div
      className={cn(
        'flex items-center h-[48px] px-3 gap-2 shrink-0',
        'bg-[oklch(from_var(--card)_l_c_h/0.5)] border-b border-border-glass'
      )}
    >
      {/* Nav button cluster */}
      <div className="flex items-center gap-1 shrink-0">
        <TooltipButton
          variant="ghost"
          size="icon"
          className={cn(
            'size-[30px] rounded-full',
            'bg-foreground/[0.03] border border-border-glass',
            'disabled:opacity-40 disabled:border-transparent disabled:bg-transparent'
          )}
          onClick={onGoBack}
          disabled={!canGoBack}
          tooltip={t('toolbar.back')}
          tooltipSide="bottom"
        >
          <ArrowLeft className="w-4 h-4" />
        </TooltipButton>

        <TooltipButton
          variant="ghost"
          size="icon"
          className={cn(
            'size-[30px] rounded-full',
            'bg-foreground/[0.03] border border-border-glass',
            'disabled:opacity-40 disabled:border-transparent disabled:bg-transparent'
          )}
          onClick={onGoForward}
          disabled={!canGoForward}
          tooltip={t('toolbar.forward')}
          tooltipSide="bottom"
        >
          <ArrowRight className="w-4 h-4" />
        </TooltipButton>

        <TooltipButton
          variant="ghost"
          size="icon"
          className={cn(
            'size-[30px] rounded-full',
            'bg-foreground/[0.03] border border-border-glass'
          )}
          onClick={onReload}
          tooltip={isLoading ? t('toolbar.loading') : t('toolbar.reload')}
          tooltipSide="bottom"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RotateCw className="w-3.5 h-3.5" />
          )}
        </TooltipButton>
      </div>

      {/* URL input as glass pill + smart-suggestions combobox */}
      <div className="relative flex-1 min-w-0">
        <div
          className={cn(
            'h-9 flex items-center gap-2 rounded-full px-3',
            'bg-foreground/[0.05] border border-border-glass',
            'focus-within:border-primary/50 focus-within:bg-foreground/[0.07] transition-colors'
          )}
        >
          {isSecure ? (
            <Lock className="w-3.5 h-3.5 shrink-0 text-status-success" />
          ) : (
            <Globe2 className="w-3.5 h-3.5 shrink-0 text-muted-foreground/70" />
          )}
          <Input
            ref={urlInputRef as RefObject<HTMLInputElement | null>}
            value={urlInput}
            onChange={e => handleUrlChange(e.target.value)}
            onKeyDown={handleUrlSubmit}
            onFocus={handleUrlFocus}
            onBlur={handleUrlBlur}
            placeholder={t('urlBar.placeholder')}
            aria-label={t('urlBar.ariaLabel')}
            role="combobox"
            aria-expanded={showSuggestions}
            aria-controls={LISTBOX_ID}
            aria-autocomplete="list"
            aria-activedescendant={activeOptionId}
            className={cn(
              'h-6 min-w-0 flex-1 px-0 text-[12.5px]',
              'bg-transparent border-0 rounded-none',
              'font-mono text-foreground placeholder:text-muted-foreground/60',
              'focus-visible:ring-0 focus-visible:border-0 focus-visible:bg-transparent'
            )}
          />
        </div>
        {showSuggestions && (
          <AddressSuggestions
            listboxId={LISTBOX_ID}
            suggestions={suggestions}
            activeIndex={activeIndex}
            onHoverIndex={setActiveIndex}
            onSelect={handleSuggestionSelect}
          />
        )}
      </div>

      {/* Trailing cluster — add-to-library, home */}
      <div className="flex items-center gap-1 shrink-0">
        <TooltipButton
          variant="ghost"
          size="icon"
          className="size-[30px] rounded-[8px] text-muted-foreground hover:text-primary"
          onClick={onAddToLibrary}
          disabled={!hasActiveTab}
          tooltip={t('toolbar.addToLibrary')}
          tooltipSide="bottom"
        >
          <BookmarkPlus className="w-4 h-4" />
        </TooltipButton>

        <TooltipButton
          variant="ghost"
          size="icon"
          className="size-[30px] rounded-[8px] text-muted-foreground hover:text-foreground"
          onClick={onGoHome}
          tooltip={t('toolbar.home')}
          tooltipSide="bottom"
        >
          <Home className="w-4 h-4" />
        </TooltipButton>

        <TooltipButton
          variant="ghost"
          size="icon"
          className="size-[30px] rounded-[8px] text-muted-foreground hover:text-foreground"
          onClick={onOpenHistory}
          tooltip={t('toolbar.history')}
          tooltipSide="bottom"
        >
          <History className="w-4 h-4" />
        </TooltipButton>
      </div>
    </div>
  );
}
