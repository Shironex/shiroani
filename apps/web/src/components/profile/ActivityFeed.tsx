import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Activity, Film, RefreshCw } from 'lucide-react';
import type { AniListActivity } from '@shiroani/shared';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { formatRelativeTime } from '@/lib/relative-time';
import { useViewerActivity } from '@/hooks/useViewerActivity';
import { useAniListAuthStore } from '@/stores/useAniListAuthStore';

/**
 * Recent AniList activity feed for the authenticated viewer.
 *
 * The feed is viewer-scoped (resolved from the stored OAuth token main-side via
 * {@link useViewerActivity}), so it only renders real entries when an AniList
 * account is connected. When viewing a public username without a connection the
 * "connect" prompt shows instead of an empty list — an empty feed there would
 * read as a bug rather than the by-design "no token, no viewer activity".
 *
 * `status`/`progress` arrive as AniList's freeform strings (progress can be a
 * range like "12 - 13") and are rendered raw with Polish chrome — there is no
 * status→PL mapping table, matching how raw media titles are surfaced.
 */
export function ActivityFeed() {
  const { t } = useTranslation('profile');
  const connected = useAniListAuthStore(s => s.status.connected);
  const { activities, isLoading, error, refetch } = useViewerActivity();

  // Activity is viewer-scoped: without a connected account there is nothing to
  // fetch. Surface a "connect" prompt instead of conflating it with an empty
  // feed (which would read as a bug for a public profile you don't own).
  if (!connected) {
    return <ActivityEmpty message={t('activity.notConnected')} />;
  }

  if (error) {
    return (
      <div
        className={cn(
          'flex flex-col items-center gap-3 rounded-xl px-5 py-6 text-center',
          'border border-destructive/25 bg-destructive/[0.06]'
        )}
      >
        <p className="text-[12px] text-muted-foreground leading-snug break-words max-w-[44ch]">
          {t('activity.error')}
        </p>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={refetch}>
          <RefreshCw className="w-3.5 h-3.5" />
          {t('activity.retry')}
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2" aria-busy="true">
        {SKELETON_ROWS.map(i => (
          <SkeletonRow key={i} />
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return <ActivityEmpty message={t('activity.empty')} />;
  }

  return (
    <div className="flex flex-col gap-1.5">
      {activities.map(item => (
        <ActivityRow key={item.id} item={item} />
      ))}
    </div>
  );
}

/** Picks the most readable media title, profile-local order (english-first). */
function mediaTitle(title: { english?: string; romaji?: string; native?: string }): string {
  return title.english || title.romaji || title.native || '?';
}

interface ActivityRowProps {
  item: AniListActivity;
}

const ActivityRow = memo(function ActivityRow({ item }: ActivityRowProps) {
  const { t: tBrowser } = useTranslation('browser');
  const relative = formatRelativeTime(item.createdAt * 1000, tBrowser);

  if (item.type === 'text') {
    return (
      <div className="flex items-start gap-3 py-2 px-2.5 rounded-lg bg-foreground/3 border border-border-glass/60">
        <div className="grid place-items-center w-[18px] h-[18px] shrink-0 mt-0.5 rounded-md bg-primary/15 text-primary">
          <Activity className="w-3 h-3" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] text-foreground/90 leading-snug whitespace-pre-wrap break-words">
            {item.text}
          </p>
          <span className="font-mono text-[10px] text-muted-foreground/70 tabular-nums">
            {relative}
          </span>
        </div>
      </div>
    );
  }

  const title = mediaTitle(item.media.title);
  const line = [item.status, item.progress].filter(Boolean).join(' · ');

  return (
    <div className="flex items-center gap-3 py-1.5 px-2.5 rounded-lg bg-foreground/3 border border-border-glass/60">
      <PosterThumb src={item.media.coverImage} alt={title} />
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-medium text-foreground/90 leading-tight truncate">{title}</p>
        {line && <p className="text-[11px] text-muted-foreground leading-tight truncate">{line}</p>}
      </div>
      <span className="font-mono text-[10px] text-muted-foreground/70 tabular-nums shrink-0">
        {relative}
      </span>
    </div>
  );
});

/**
 * 40×56 poster thumb with a placeholder fallback. Local error state (not the
 * `display:none` helper) so a missing cover shows a placeholder rather than a
 * hole. No hover-scale / backdrop-blur / will-change — these rows scroll.
 */
function PosterThumb({ src, alt }: { src?: string; alt: string }) {
  const [imgError, setImgError] = useState(false);
  const showImage = src && !imgError;

  return (
    <div className="w-10 h-14 shrink-0 rounded-md overflow-hidden border border-border/20 bg-muted/30">
      {showImage ? (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
          loading="lazy"
          draggable={false}
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="w-full h-full grid place-items-center">
          <Film className="w-3.5 h-3.5 text-muted-foreground/30" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 py-1.5 px-2.5 rounded-lg bg-foreground/3 border border-border-glass/60">
      <div className="w-10 h-14 shrink-0 rounded-md bg-foreground/5 animate-pulse" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="h-3 w-2/5 rounded bg-foreground/5 animate-pulse" />
        <div className="h-2.5 w-1/4 rounded bg-foreground/5 animate-pulse" />
      </div>
    </div>
  );
}

function ActivityEmpty({ message }: { message: string }) {
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
      <p className="text-[12px] text-muted-foreground/70 leading-snug max-w-[40ch]">{message}</p>
    </div>
  );
}

const SKELETON_ROWS = [0, 1, 2];
