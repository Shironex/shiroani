import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarDays } from 'lucide-react';
import { toLocalDate } from '@shiroani/shared';
import type { AiringAnime } from '@shiroani/shared';
import { useScheduleStore } from '@/stores/useScheduleStore';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { useAppStore } from '@/stores/useAppStore';
import { cn } from '@/lib/utils';
import { formatTime } from '@/components/schedule/schedule-utils';
import { getAnimeTitle, getCoverUrl } from '@/lib/anime-utils';
import { handleImageError } from '@/lib/image-utils';

/** Airing Today section — horizontal scrolling poster cards */
export function AiringTodaySection({ maxCards }: { maxCards: number }) {
  const { t } = useTranslation('browser');
  const todayKey = useMemo(() => toLocalDate(new Date()), []);

  const todayEntries = useScheduleStore(s => s.schedule[todayKey]);
  const isLoading = useScheduleStore(s => s.isLoading);
  const navigateTo = useAppStore(s => s.navigateTo);

  const libraryEntries = useLibraryStore(s => s.entries);
  const libraryAnilistIds = useMemo(() => {
    const ids = new Set<number>();
    for (const entry of libraryEntries) {
      if (entry.anilistId != null) ids.add(entry.anilistId);
    }
    return ids;
  }, [libraryEntries]);

  const subscribedIds = useNotificationStore(s => s.subscribedIds);

  useEffect(() => {
    if (!todayEntries) {
      useScheduleStore.getState().fetchDaily(todayKey);
    }
  }, [todayKey, todayEntries]);

  const { cards, hasMore } = useMemo(() => {
    if (!todayEntries)
      return { cards: [] as (AiringAnime & { isUser: boolean })[], hasMore: false };

    const sorted = [...todayEntries].sort((a, b) => a.airingAt - b.airingAt);

    // User's anime first, then the rest
    const user: (AiringAnime & { isUser: boolean })[] = [];
    const other: (AiringAnime & { isUser: boolean })[] = [];

    for (const entry of sorted) {
      const mediaId = entry.media.id;
      const isUser = libraryAnilistIds.has(mediaId) || subscribedIds.has(mediaId);
      if (isUser) user.push({ ...entry, isUser: true });
      else other.push({ ...entry, isUser: false });
    }

    const all = [...user, ...other];
    return {
      cards: all.slice(0, maxCards),
      hasMore: all.length > maxCards,
    };
  }, [todayEntries, libraryAnilistIds, subscribedIds, maxCards]);

  // Loading state
  if (!todayEntries && isLoading) {
    return (
      <div>
        <div className="mb-3 flex items-center gap-2">
          <span className="grid size-5 place-items-center rounded-md bg-primary/12 text-primary shrink-0">
            <CalendarDays className="w-3 h-3" />
          </span>
          <h2 className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {t('newTab.airingToday.title')}
          </h2>
        </div>
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="w-[100px] shrink-0 animate-pulse">
              <div className="aspect-[3/4] rounded-lg bg-muted/40" />
              <div className="mt-1.5 h-3 w-[70%] rounded bg-muted/30" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (!todayEntries || todayEntries.length === 0) return null;

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <span className="grid size-5 place-items-center rounded-md bg-primary/12 text-primary shrink-0">
          <CalendarDays className="w-3 h-3" />
        </span>
        <h2 className="flex-1 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {t('newTab.airingToday.title')}
        </h2>
        <button
          onClick={() => navigateTo('schedule')}
          className="font-mono text-[10px] uppercase tracking-[0.15em] text-primary/70 hover:text-primary transition-colors cursor-pointer"
        >
          {t('newTab.airingToday.viewAll')}
        </button>
      </div>

      {/* Horizontal scroll row */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
        {cards.map(entry => (
          <AiringPosterCard key={entry.id} entry={entry} isUser={entry.isUser} />
        ))}

        {/* "More" card */}
        {hasMore && (
          <button
            onClick={() => navigateTo('schedule')}
            className="w-[100px] shrink-0 aspect-[3/4] rounded-lg border border-dashed border-border/40 hover:border-border/70 hover:bg-accent/20 transition-all flex flex-col items-center justify-center gap-1.5 text-muted-foreground/50 hover:text-muted-foreground/80"
          >
            <span className="text-lg">+</span>
            <span className="text-2xs">{t('newTab.airingToday.more')}</span>
          </button>
        )}
      </div>
    </div>
  );
}

/** Small poster card for the airing today horizontal scroll */
function AiringPosterCard({ entry, isUser }: { entry: AiringAnime; isUser?: boolean }) {
  const { t } = useTranslation('browser');
  const [imgError, setImgError] = useState(false);
  const title = getAnimeTitle(entry.media);
  const coverUrl = getCoverUrl(entry.media);
  const time = formatTime(entry.airingAt);

  return (
    <div className="w-[100px] shrink-0 group">
      <div
        className={cn(
          'relative aspect-[3/4] rounded-lg overflow-hidden border transition-all',
          isUser
            ? 'border-primary/30 shadow-[0_0_8px_-2px] shadow-primary/20'
            : 'border-border/20 hover:border-border/50'
        )}
      >
        {coverUrl && !imgError ? (
          <img
            src={coverUrl}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
            onError={e => {
              setImgError(true);
              handleImageError(e);
            }}
          />
        ) : (
          <div className="w-full h-full bg-muted/40" />
        )}

        {/* Time badge */}
        <div className="absolute top-1.5 right-1.5">
          <span className="text-[10px] font-medium bg-background/80 text-foreground/80 px-1 py-px rounded">
            {time}
          </span>
        </div>

        {/* Title + episode overlay at bottom */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 pt-6">
          <p className="text-2xs font-medium text-white leading-tight line-clamp-2">{title}</p>
          <p className="text-[10px] text-white/60 mt-0.5">
            {t('newTab.airingToday.episodeShort', { episode: entry.episode })}
          </p>
        </div>
      </div>
    </div>
  );
}
