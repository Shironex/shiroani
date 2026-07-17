import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Activity, Film, RefreshCw } from 'lucide-react';
import type { AniListActivity } from '@shiroani/shared';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ImageWithFallback, mediaTitle } from '@/components/shared/ImageWithFallback';
import { formatRelativeTime } from '@/lib/relative-time';

const SKELETON_ROWS = [0, 1, 2];

interface ActivityRowProps {
  item: AniListActivity;
}

const ActivityRow = memo(function ActivityRow({ item }: ActivityRowProps) {
  const { t } = useTranslation('profile');
  const { t: tBrowser } = useTranslation('browser');
  const relative = formatRelativeTime(item.createdAt * 1000, tBrowser);

  if (item.type === 'text') {
    return (
      <div className="flex items-start gap-3 py-2 px-2.5 rounded-lg bg-foreground/3 border border-border-glass/60">
        <div className="grid place-items-center w-[18px] h-[18px] shrink-0 mt-0.5 rounded-md bg-primary/15 text-primary">
          <Activity className="w-3 h-3" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-foreground/90 leading-snug whitespace-pre-wrap break-words">
            {item.text}
          </p>
          <span className="font-mono text-2xs text-muted-foreground tabular-nums">{relative}</span>
        </div>
      </div>
    );
  }

  const title = mediaTitle(item.media.title, t('untitled'));
  const line = [item.status, item.progress].filter(Boolean).join(' · ');

  return (
    <div className="flex items-center gap-3 py-1.5 px-2.5 rounded-lg bg-foreground/3 border border-border-glass/60">
      <PosterThumb src={item.media.coverImage} alt={title} />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-foreground/90 leading-tight truncate">{title}</p>
        {line && <p className="text-[11px] text-muted-foreground leading-tight truncate">{line}</p>}
      </div>
      <span className="font-mono text-2xs text-muted-foreground tabular-nums shrink-0">
        {relative}
      </span>
    </div>
  );
});

/**
 * 40×56 poster thumb with a local placeholder fallback. No hover-scale /
 * backdrop-blur / will-change — these rows scroll.
 */
function PosterThumb({ src, alt }: { src?: string; alt: string }) {
  return (
    <ImageWithFallback
      src={src}
      alt={alt}
      className="w-10 h-14 rounded-md"
      fallback={<Film className="w-3.5 h-3.5 text-muted-foreground/30" aria-hidden="true" />}
    />
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 py-1.5 px-2.5 rounded-lg bg-foreground/3 border border-border-glass/60">
      <Skeleton className="w-10 h-14 shrink-0" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <Skeleton className="h-3 w-2/5" />
        <Skeleton className="h-2.5 w-1/4" />
      </div>
    </div>
  );
}

/** The activity rows list. */
export function ActivityList({ activities }: { activities: AniListActivity[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      {activities.map(item => (
        <ActivityRow key={item.id} item={item} />
      ))}
    </div>
  );
}

export function ActivityLoading() {
  return (
    <div className="flex flex-col gap-2" aria-busy="true">
      {SKELETON_ROWS.map(i => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}

export function ActivityError({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { t } = useTranslation('profile');
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 rounded-xl px-5 py-6 text-center',
        'border border-destructive/25 bg-destructive/[0.06]'
      )}
    >
      <p className="text-xs text-muted-foreground leading-snug break-words max-w-[44ch]">
        {message}
      </p>
      <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={onRetry}>
        <RefreshCw className="w-3.5 h-3.5" />
        {t('activity.retry')}
      </Button>
    </div>
  );
}

export function ActivityEmpty({ message }: { message: string }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2.5 rounded-xl px-5 py-8 text-center',
        'border border-border-glass bg-foreground/3'
      )}
    >
      <div className="grid place-items-center w-9 h-9 rounded-xl border border-border-glass bg-foreground/5 text-muted-foreground/60">
        <Activity className="w-4 h-4" aria-hidden="true" />
      </div>
      <p className="text-xs text-muted-foreground/70 leading-snug max-w-[40ch]">{message}</p>
    </div>
  );
}
