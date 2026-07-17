import { type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Home,
  X,
  BookmarkPlus,
  History,
  Lock,
  Globe2,
  Star,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { TooltipButton } from '@/components/ui/tooltip-button';
import { AddressSuggestions } from '@/components/browser/AddressSuggestions';
import { useBrowserToolbar } from './BrowserToolbar.hooks';
import type { IBrowserToolbarProps } from './BrowserToolbar.types';

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
 *   0 back · 1 forward · 2 reload · 3 favorite-star · 4 add-to-library · 5 home · 6 history
 */
export default function BrowserToolbar({
  urlInput,
  committedUrl,
  onUrlInputChange,
  canGoBack,
  canGoForward,
  isLoading,
  hasActiveTab,
  isFavorite,
  onGoBack,
  onGoForward,
  onReload,
  onStop,
  onNavigate,
  onGoHome,
  onToggleFavorite,
  onAddToLibrary,
  onOpenHistory,
  urlInputRef: externalUrlInputRef,
}: IBrowserToolbarProps) {
  const { t } = useTranslation('browser');
  const {
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
  } = useBrowserToolbar(urlInput, committedUrl, onUrlInputChange, onNavigate, externalUrlInputRef);

  return (
    <div
      className={cn(
        'flex items-center h-[48px] px-3 gap-2 shrink-0',
        'bg-card/50 border-b border-border-glass'
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
          onClick={isLoading ? onStop : onReload}
          tooltip={isLoading ? t('toolbar.stop') : t('toolbar.reload')}
          tooltipSide="bottom"
        >
          {isLoading ? <X className="w-4 h-4" /> : <RotateCw className="w-3.5 h-3.5" />}
        </TooltipButton>
      </div>

      {/* URL input as glass pill + smart-suggestions combobox */}
      <div className="relative flex-1 min-w-0">
        <div
          className={cn(
            'h-9 flex items-center gap-2 rounded-full px-3',
            'bg-foreground/[0.05] border border-border-glass',
            'focus-within:border-primary/50 focus-within:bg-foreground/[0.07]',
            'focus-within:ring-2 focus-within:ring-ring/20 transition-colors'
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

      {/* Trailing cluster — favorite star, add-to-library, home, history */}
      <div className="flex items-center gap-1 shrink-0">
        <TooltipButton
          variant="ghost"
          size="icon"
          className={cn(
            'size-[30px] rounded-full',
            isFavorite
              ? 'text-primary hover:text-primary'
              : 'text-muted-foreground hover:text-primary'
          )}
          onClick={onToggleFavorite}
          disabled={!hasActiveTab}
          aria-pressed={isFavorite}
          tooltip={isFavorite ? t('toolbar.removeFavorite') : t('toolbar.addFavorite')}
          tooltipSide="bottom"
        >
          <Star className={cn('w-4 h-4', isFavorite && 'fill-current')} />
        </TooltipButton>

        <TooltipButton
          variant="ghost"
          size="icon"
          className="size-[30px] rounded-full text-muted-foreground hover:text-primary"
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
          className="size-[30px] rounded-full text-muted-foreground hover:text-foreground"
          onClick={onGoHome}
          tooltip={t('toolbar.home')}
          tooltipSide="bottom"
        >
          <Home className="w-4 h-4" />
        </TooltipButton>

        <TooltipButton
          variant="ghost"
          size="icon"
          className="size-[30px] rounded-full text-muted-foreground hover:text-foreground"
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
