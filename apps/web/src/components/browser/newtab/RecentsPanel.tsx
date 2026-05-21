import { useTranslation } from 'react-i18next';
import { Clock } from 'lucide-react';
import type { FrequentSite } from '@shiroani/shared';
import { PanelHeader } from './PanelHeader';
import { FrequentSiteRow, EmptyRecents } from './FrequentSiteRow';

interface RecentsPanelProps {
  frequentSites: FrequentSite[];
  onNavigate: (url: string) => void;
}

/** Recent visits panel — favicon rows of the most frequent sites. */
export function RecentsPanel({ frequentSites, onNavigate }: RecentsPanelProps) {
  const { t } = useTranslation('browser');
  return (
    <section
      aria-labelledby="newtab-recent"
      className="relative rounded-[14px] border border-border-glass bg-foreground/[0.025] p-4 overflow-hidden min-w-0"
    >
      <PanelHeader
        id="newtab-recent"
        icon={Clock}
        title={t('newTab.recents.title')}
        meta={frequentSites.length > 0 ? `${frequentSites.length}` : undefined}
      />

      {frequentSites.length > 0 ? (
        <div className="flex flex-col gap-0.5">
          {frequentSites.slice(0, 8).map(site => (
            <FrequentSiteRow key={site.url} site={site} onClick={() => onNavigate(site.url)} />
          ))}
        </div>
      ) : (
        <EmptyRecents />
      )}
    </section>
  );
}
