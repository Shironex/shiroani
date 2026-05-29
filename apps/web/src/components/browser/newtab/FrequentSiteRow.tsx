import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { History } from 'lucide-react';
import type { FrequentSite } from '@shiroani/shared';
import { hostFromUrl } from '@/lib/url-utils';
import { formatRelativeTime } from '@/lib/relative-time';

/** Frequent site row — favicon + title + host + time-ago */
export function FrequentSiteRow({ site, onClick }: { site: FrequentSite; onClick: () => void }) {
  const { t } = useTranslation('browser');
  const [imgError, setImgError] = useState(false);
  const host = hostFromUrl(site.url) ?? site.url;

  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-foreground/[0.05] cursor-pointer min-w-0"
    >
      {site.favicon && !imgError ? (
        <img
          src={site.favicon}
          alt=""
          className="size-4 rounded-sm shrink-0"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="size-4 rounded-sm bg-muted shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[11.5px] font-medium text-foreground/90 leading-tight">
          {site.title}
        </div>
        <div className="truncate font-mono text-[9.5px] text-muted-foreground leading-tight">
          {host}
        </div>
      </div>
      <span className="shrink-0 font-mono text-[9.5px] text-muted-foreground/70">
        {formatRelativeTime(site.lastVisited, t)}
      </span>
    </button>
  );
}

export function EmptyRecents() {
  const { t } = useTranslation('browser');
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-[10px] border border-dashed border-border-glass bg-foreground/[0.02] px-4 py-6 text-center">
      <span className="grid size-8 place-items-center rounded-md bg-primary/10 text-primary">
        <History className="w-3.5 h-3.5" />
      </span>
      <p className="text-[11.5px] font-medium text-foreground/80">
        {t('newTab.recents.empty.title')}
      </p>
      <p className="max-w-[28ch] text-[10.5px] text-muted-foreground">
        {t('newTab.recents.empty.body')}
      </p>
    </div>
  );
}
