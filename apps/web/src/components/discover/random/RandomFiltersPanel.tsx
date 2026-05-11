import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SlidersHorizontal } from 'lucide-react';
import { GenrePicker } from '@/components/discover/GenrePicker';

interface RandomFiltersPanelProps {
  included: string[];
  excluded: string[];
  disabled: boolean;
  onChange: (included: string[], excluded: string[]) => void;
}

export const RandomFiltersPanel = memo(function RandomFiltersPanel({
  included,
  excluded,
  disabled,
  onChange,
}: RandomFiltersPanelProps) {
  const { t } = useTranslation('discover');
  const [open, setOpen] = useState(true);
  const hasFilters = included.length > 0 || excluded.length > 0;

  return (
    <div className="rounded-[12px] border border-border-glass bg-card/40 backdrop-blur-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-accent/30 transition-colors"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] font-semibold text-foreground/90">
            {t('genres.title')}
          </span>
          {hasFilters && (
            <span className="text-2xs text-muted-foreground">
              {included.length > 0 && <span className="text-primary">+{included.length}</span>}
              {included.length > 0 && excluded.length > 0 && ' · '}
              {excluded.length > 0 && <span className="text-destructive">−{excluded.length}</span>}
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
});
