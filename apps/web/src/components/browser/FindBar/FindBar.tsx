import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { TooltipButton } from '@/components/ui/tooltip-button';
import { useFindBar } from './FindBar.hooks';
import type { IFindBarProps } from './FindBar.types';

/**
 * In-page search bar (Ctrl+F). Drives the active <webview>'s findInPage /
 * stopFindInPage and renders the live match count from the `found-in-page`
 * event. Mounts only while find mode is active, so it never disturbs the
 * toolbar's button order. Esc closes; Enter / Shift+Enter step matches.
 */
export default function FindBar({ activePaneId, onClose }: IFindBarProps) {
  const { t } = useTranslation('browser');
  const {
    inputRef,
    query,
    matches,
    activeMatch,
    hasQuery,
    onQueryChange,
    onNext,
    onPrev,
    onCloseBar,
    onKeyDown,
  } = useFindBar(activePaneId, onClose);

  return (
    <div
      role="search"
      className={cn(
        'flex items-center h-[42px] px-3 gap-2 shrink-0',
        'bg-card/60 border-b border-border-glass'
      )}
    >
      <div
        className={cn(
          'flex-1 min-w-0 max-w-md h-8 flex items-center gap-2 rounded-full px-3',
          'bg-foreground/[0.05] border border-border-glass',
          'focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-ring/20 transition-colors'
        )}
      >
        <Input
          ref={inputRef}
          value={query}
          onChange={e => onQueryChange(e.target.value)}
          onKeyDown={onKeyDown}
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
        onClick={onPrev}
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
        onClick={onNext}
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
        onClick={onCloseBar}
        tooltip={t('find.close')}
        tooltipSide="bottom"
      >
        <X className="w-4 h-4" />
      </TooltipButton>
    </div>
  );
}
