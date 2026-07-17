import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { SlidersHorizontal } from 'lucide-react';
import { GenrePicker } from '@/components/discover/GenrePicker';
import { useRandomFiltersPanel } from './RandomFiltersPanel.hooks';
import type { IRandomFiltersPanelProps } from './RandomFiltersPanel.types';

function RandomFiltersPanel({ included, excluded, disabled, onChange }: IRandomFiltersPanelProps) {
  const { t } = useTranslation('discover');
  const { open, toggleOpen, hasFilters, hasIncluded, hasExcluded, showSeparator } =
    useRandomFiltersPanel({ included, excluded });

  return (
    <div className="rounded-xl border border-border-glass bg-card/40 overflow-hidden">
      <button
        type="button"
        onClick={toggleOpen}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-accent/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] font-semibold text-foreground/90">
            {t('genres.title')}
          </span>
          {hasFilters && (
            <span className="text-2xs text-muted-foreground">
              {hasIncluded && <span className="text-primary">+{included.length}</span>}
              {showSeparator && ' · '}
              {hasExcluded && <span className="text-destructive">−{excluded.length}</span>}
            </span>
          )}
        </div>
        <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground/70">
          {open ? t('genres.collapse') : t('genres.expand')}
        </span>
      </button>
      {open && (
        <div className="px-4 pb-3 pt-1 space-y-2 border-t border-border-glass/60">
          <p className="text-2xs text-muted-foreground/70 leading-relaxed">{t('genres.hint')}</p>
          <GenrePicker
            included={included}
            excluded={excluded}
            onChange={onChange}
            disabled={disabled}
          />
        </div>
      )}
    </div>
  );
}

export default memo(RandomFiltersPanel);
