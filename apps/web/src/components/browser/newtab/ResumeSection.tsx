import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Play } from 'lucide-react';
import type { AnimeEntry } from '@shiroani/shared';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useAppStore } from '@/stores/useAppStore';
import { hostFromUrl } from '@/lib/url-utils';
import { Button } from '@/components/ui/button';
import { PillTag } from '@/components/ui/pill-tag';
import { ProgressBar } from '@/components/shared/ProgressBar';

/** Resume watching section — pulls currently-watching entries from library. */
export function ResumeWatchingSection({ onNavigate }: { onNavigate: (url: string) => void }) {
  const { t } = useTranslation('browser');
  const entries = useLibraryStore(s => s.entries);
  const navigateTo = useAppStore(s => s.navigateTo);

  const watching = useMemo(() => {
    return entries
      .filter(e => e.status === 'watching')
      .sort((a, b) => {
        const ta = new Date(a.updatedAt || a.addedAt).getTime();
        const tb = new Date(b.updatedAt || b.addedAt).getTime();
        return tb - ta;
      })
      .slice(0, 6);
  }, [entries]);

  return (
    <section
      aria-labelledby="newtab-resume"
      className="relative rounded-[14px] border border-border-glass bg-foreground/[0.025] p-4 overflow-hidden"
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="grid size-5 place-items-center rounded-md bg-primary/12 text-primary shrink-0">
          <Play className="w-3 h-3" />
        </span>
        <h2
          id="newtab-resume"
          className="flex-1 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
        >
          {t('newTab.resume.title')}
        </h2>
        {watching.length > 0 ? (
          <span className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-muted-foreground/70">
            {t('newTab.resume.count', { count: watching.length })}
          </span>
        ) : null}
      </div>

      {watching.length === 0 ? (
        <EmptyResumeState onBrowseLibrary={() => navigateTo('library')} />
      ) : (
        <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
          {watching.map(entry => (
            <ResumeCard
              key={entry.id}
              entry={entry}
              onResume={() => {
                if (entry.resumeUrl) onNavigate(entry.resumeUrl);
                else navigateTo('library');
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function ResumeCard({ entry, onResume }: { entry: AnimeEntry; onResume: () => void }) {
  const { t } = useTranslation('browser');
  const [imgError, setImgError] = useState(false);
  const total = entry.episodes ?? 0;
  const current = entry.currentEpisode ?? 0;
  const progress = total > 0 ? Math.min(100, (current / total) * 100) : 0;
  const episodeLabel =
    current > 0 ? `EP ${String(current).padStart(2, '0')}` : t('newTab.resume.episodeUnknown');
  const host = entry.resumeUrl ? hostFromUrl(entry.resumeUrl) : null;

  return (
    <button
      onClick={onResume}
      className="group relative flex w-[200px] shrink-0 flex-col overflow-hidden rounded-[10px] border border-border-glass bg-foreground/[0.04] text-left transition-colors hover:border-primary/40 hover:bg-primary/[0.04] cursor-pointer"
      aria-label={t('newTab.resume.ariaResume', { title: entry.title })}
    >
      <div className="relative h-[96px] w-full overflow-hidden bg-gradient-to-br from-primary/30 to-primary/5">
        {entry.coverImage && !imgError ? (
          <img
            src={entry.coverImage}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,oklch(1_0_0/0.2),transparent_55%)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

        <div className="absolute left-2 top-2">
          <PillTag variant="muted" className="bg-black/60 text-white/90 backdrop-blur-sm">
            {episodeLabel}
          </PillTag>
        </div>

        <div className="absolute inset-0 grid place-items-center opacity-0 transition-opacity group-hover:opacity-100">
          <span className="grid size-9 place-items-center rounded-full bg-white/90 text-background shadow-lg">
            <Play className="w-4 h-4 fill-current" />
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 p-2.5">
        <p className="line-clamp-1 text-[12px] font-bold leading-tight text-foreground">
          {entry.title}
        </p>
        <p className="line-clamp-1 font-mono text-[10px] text-muted-foreground">
          {host ?? t('newTab.resume.noUrl')}
          {total > 0 && ` · ${current}/${total}`}
        </p>
        {total > 0 && <ProgressBar value={progress} thickness={2} glow />}
      </div>
    </button>
  );
}

function EmptyResumeState({ onBrowseLibrary }: { onBrowseLibrary: () => void }) {
  const { t } = useTranslation('browser');
  return (
    <div className="flex items-center justify-between gap-4 rounded-[10px] border border-dashed border-border-glass bg-foreground/[0.02] px-4 py-5">
      <div className="flex items-start gap-3 min-w-0">
        <span className="grid size-8 place-items-center rounded-md bg-primary/10 text-primary shrink-0">
          <Play className="w-3.5 h-3.5" />
        </span>
        <div className="min-w-0">
          <p className="text-[12.5px] font-semibold text-foreground">
            {t('newTab.resume.empty.title')}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {t('newTab.resume.empty.body')}
          </p>
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={onBrowseLibrary}>
        {t('newTab.resume.empty.cta')}
      </Button>
    </div>
  );
}
