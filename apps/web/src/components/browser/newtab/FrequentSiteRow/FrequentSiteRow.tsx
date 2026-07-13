import { Globe } from 'lucide-react';
import { useFrequentSiteRow } from './FrequentSiteRow.hooks';
import type { IFrequentSiteRowProps } from './FrequentSiteRow.types';

/** Frequent site row — favicon + title + host + time-ago */
export default function FrequentSiteRow({ site, onClick }: IFrequentSiteRowProps) {
  const { imgError, setImgError, host, relative } = useFrequentSiteRow(site);

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
        <Globe className="size-4 shrink-0 text-muted-foreground/70" />
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[11.5px] font-medium text-foreground/90 leading-tight">
          {site.title}
        </div>
        <div className="truncate font-mono text-[9.5px] text-muted-foreground leading-tight">
          {host}
        </div>
      </div>
      <span className="shrink-0 font-mono text-[9.5px] text-muted-foreground/70">{relative}</span>
    </button>
  );
}
