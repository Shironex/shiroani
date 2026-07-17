import { useTranslation } from 'react-i18next';
import { Plus, Eye, Bookmark } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PanelHeader } from '../PanelHeader';
import { SiteCard } from '../SiteCard';
import type { IQuickAccessPanelProps } from './QuickAccessPanel.types';

/** Quick Access panel — tile grid of saved/predefined sites plus an add tile. */
export default function QuickAccessPanel({
  sites,
  hiddenPredefined,
  onNavigate,
  onRemove,
  onAdd,
  onShowPredefined,
}: IQuickAccessPanelProps) {
  const { t } = useTranslation('browser');

  const siteCards = sites.map(site => (
    <SiteCard
      key={site.id}
      site={site}
      onClick={() => onNavigate(site.url)}
      onRemove={() => onRemove(site)}
    />
  ));

  const hiddenChips = hiddenPredefined.map(site => (
    <button
      key={site.id}
      onClick={() => onShowPredefined(site.id)}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-foreground/[0.04] hover:bg-foreground/[0.08] text-[11px] text-muted-foreground hover:text-foreground/80 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <Eye className="w-3 h-3" />
      {site.name}
    </button>
  ));

  return (
    <section
      aria-labelledby="newtab-quick-access"
      className="relative rounded-[calc(var(--radius)+4px)] border border-border-glass bg-foreground/[0.025] p-4 overflow-hidden min-w-0"
    >
      <PanelHeader
        id="newtab-quick-access"
        icon={Bookmark}
        title={t('newTab.quickAccess.title')}
        meta={t('newTab.quickAccess.tabsCount', { count: sites.length })}
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
        {siteCards}
        {/* Add site button — tile shape */}
        <button
          onClick={onAdd}
          aria-label={t('newTab.quickAccess.addAria')}
          className={cn(
            'group relative flex aspect-[1.7] flex-col items-center justify-center gap-1.5',
            'rounded-lg border border-dashed border-border-glass bg-foreground/[0.02]',
            'text-muted-foreground transition-colors',
            'hover:border-primary/40 hover:bg-primary/[0.06] hover:text-primary cursor-pointer',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50'
          )}
        >
          <Plus className="w-4 h-4" />
          <span className="font-mono text-2xs uppercase tracking-[0.18em]">
            {t('newTab.quickAccess.add')}
          </span>
        </button>
      </div>

      {hiddenPredefined.length > 0 && (
        <div className="mt-4 pt-3 border-t border-border-glass">
          <h3 className="mb-2 font-mono text-2xs uppercase tracking-[0.18em] text-muted-foreground/80">
            {t('newTab.quickAccess.hiddenTitle')}
          </h3>
          <div className="flex flex-wrap gap-1.5">{hiddenChips}</div>
        </div>
      )}
    </section>
  );
}
