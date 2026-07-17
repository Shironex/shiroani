import { useTranslation } from 'react-i18next';
import { Clock } from 'lucide-react';
import { PanelHeader } from '../PanelHeader';
import { FrequentSiteRow, EmptyRecents } from '../FrequentSiteRow';
import type { IRecentsPanelProps } from './RecentsPanel.types';

/** Recent visits panel — favicon rows of the most frequent sites. */
export default function RecentsPanel({ frequentSites, onNavigate }: IRecentsPanelProps) {
  const { t } = useTranslation('browser');

  const rows = frequentSites
    .slice(0, 8)
    .map(site => (
      <FrequentSiteRow key={site.url} site={site} onClick={() => onNavigate(site.url)} />
    ));

  return (
    <section
      aria-labelledby="newtab-recent"
      className="relative rounded-[calc(var(--radius)+4px)] border border-border-glass bg-foreground/[0.025] p-4 overflow-hidden min-w-0"
    >
      <PanelHeader
        id="newtab-recent"
        icon={Clock}
        title={t('newTab.recents.title')}
        meta={
          frequentSites.length > 0
            ? t('newTab.recents.count', { count: frequentSites.length })
            : undefined
        }
      />

      {frequentSites.length > 0 ? (
        <div className="flex flex-col gap-0.5">{rows}</div>
      ) : (
        <EmptyRecents />
      )}
    </section>
  );
}
