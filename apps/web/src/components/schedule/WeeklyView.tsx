import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { getDayNamesShort } from '@/lib/constants';
import { handleImageError } from '@/lib/image-utils';
import { Tv } from 'lucide-react';
import { formatTime, getAnimeTitle, getCoverUrl, type SlotStatus } from './schedule-utils';
import { ScheduleDayColumn } from './ScheduleDayColumn';
import { SubscribeBellButton } from './SubscribeBellButton';
import { useWeekData } from '@/hooks/useWeekData';
import { useNowSeconds } from '@/hooks/useNowSeconds';
import { useActivatable } from '@/hooks/useActivatable';
import type { AiringAnime } from '@shiroani/shared';

export interface WeeklyViewProps {
  weekDays: string[];
  getEntriesForDay: (day: string) => AiringAnime[];
  /** Raw schedule object passed through so useMemo detects changes */
  schedule: Record<string, AiringAnime[]>;
  onAnimeClick?: (anime: AiringAnime) => void;
  /**
   * AniList ids of anime present in the user's library. Cards matching one of
   * these get a primary-colour top edge + subtle wash. Library membership
   * takes precedence over subscription.
   */
  libraryAnilistIds?: ReadonlySet<number>;
  /**
   * AniList ids of anime the user has subscribed to notifications for.
   * Cards matching (and NOT in library) get a gold top edge + soft wash.
   */
  subscribedAnilistIds?: ReadonlySet<number>;
}

type MembershipKind = 'library' | 'subscribed' | 'none';

const EMPTY_IDS: ReadonlySet<number> = new Set<number>();

/**
 * Compact 7-column week grid — one column per weekday, event cards stacked
 * vertically within each. Status is encoded as a coloured left border
 * (accent = live, green = soon/sub, violet = upcoming, muted = done).
 */
export function WeeklyView({
  weekDays,
  getEntriesForDay,
  schedule,
  onAnimeClick,
  libraryAnilistIds = EMPTY_IDS,
  subscribedAnilistIds = EMPTY_IDS,
}: WeeklyViewProps) {
  const { i18n, t } = useTranslation('schedule');
  const dayNamesShort = useMemo(() => getDayNamesShort(), [i18n.language]);
  const weekData = useWeekData(weekDays, getEntriesForDay, schedule);
  const now = useNowSeconds(60_000);

  return (
    <div className="flex-1 overflow-x-auto overflow-y-hidden">
      <div className="grid h-full min-w-[1100px] grid-cols-7 divide-x divide-border-glass">
        {weekDays.map((day, idx) => {
          const dayEntries = weekData.get(day) ?? [];
          return (
            <ScheduleDayColumn
              key={day}
              day={day}
              label={dayNamesShort[idx]}
              entries={dayEntries}
              now={now}
              emptyLabel={t('weekly.emptyLabel')}
              listClassName="space-y-1.5"
              emptyStateClassName="py-6"
              emptyIconClassName="w-5 h-5"
              renderCard={(anime, status) => {
                const mediaId = anime.media.id;
                const membership: MembershipKind = libraryAnilistIds.has(mediaId)
                  ? 'library'
                  : subscribedAnilistIds.has(mediaId)
                    ? 'subscribed'
                    : 'none';
                return (
                  <WeekEventCard
                    key={`${anime.id}-${anime.episode}`}
                    anime={anime}
                    status={status}
                    membership={membership}
                    onClick={onAnimeClick}
                    nowLabel={t('weekly.now')}
                    episodeLabel={t('timetable.episodeShort', { episode: anime.episode })}
                  />
                );
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

/* ────────────── Event card ────────────── */

interface WeekEventCardProps {
  anime: AiringAnime;
  status: SlotStatus;
  membership: MembershipKind;
  onClick?: (anime: AiringAnime) => void;
  nowLabel: string;
  episodeLabel: string;
}

function WeekEventCard({
  anime,
  status,
  membership,
  onClick,
  nowLabel,
  episodeLabel,
}: WeekEventCardProps) {
  const title = getAnimeTitle(anime.media);
  const coverUrl = getCoverUrl(anime.media);
  const isLive = status === 'live';
  const isDone = status === 'done';
  const activatable = useActivatable(onClick ? () => onClick(anime) : undefined, {
    inactiveRole: 'article',
  });

  const borderColor = isLive
    ? 'border-l-primary'
    : isDone
      ? 'border-l-muted-foreground/30'
      : 'border-l-[oklch(0.5_0.15_280)]';

  // Top edge + subtle wash encodes library / subscription membership.
  // Library wins when both are true. Kept as a separate axis from the
  // status-driven left border (live/done/upcoming) so users can read both
  // signals at a glance.
  const membershipTint =
    membership === 'library'
      ? 'border-t-[3px] border-t-primary bg-primary/[0.06]'
      : membership === 'subscribed'
        ? 'border-t-[3px] border-t-[oklch(0.8_0.14_70)] bg-[oklch(0.8_0.14_70/0.06)]'
        : '';

  return (
    <div
      {...activatable}
      aria-label={title}
      className={cn(
        'group relative rounded-lg border border-l-[3px] pl-2 pr-2.5 py-2 bg-card/40',
        borderColor,
        'transition-colors duration-200',
        isLive && 'bg-primary/10 border-primary/30',
        isDone && 'opacity-55',
        onClick && 'cursor-pointer hover:bg-card/60',
        isLive && onClick && 'hover:bg-primary/15',
        membershipTint
      )}
    >
      <div className="flex gap-2">
        {/* Cover thumb — 2:3 aspect, helps users scan titles visually */}
        <div
          aria-hidden="true"
          className="w-9 h-[54px] rounded-[4px] overflow-hidden flex-shrink-0 bg-muted/30 border border-border-glass relative"
        >
          {coverUrl ? (
            <img
              src={coverUrl}
              alt=""
              loading="lazy"
              decoding="async"
              draggable={false}
              onError={handleImageError}
              className={cn('w-full h-full object-cover', isDone && 'grayscale-[30%]')}
            />
          ) : (
            <div className="w-full h-full grid place-items-center text-muted-foreground/40">
              <Tv className="w-4 h-4" />
            </div>
          )}
        </div>

        {/* Text content */}
        <div className="min-w-0 flex-1">
          <div
            className={cn(
              'font-mono text-[10px] font-bold tracking-[0.06em]',
              isLive ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            {formatTime(anime.airingAt)}
            {isLive && <span className="ml-1.5 uppercase tracking-[0.12em]">· {nowLabel}</span>}
          </div>
          <p className="mt-1 text-[11.5px] font-semibold leading-[1.25] text-foreground line-clamp-2 pr-6">
            {title}
          </p>
          <p className="mt-[3px] font-mono text-[9.5px] tracking-[0.06em] text-muted-foreground/70">
            {episodeLabel}
            {anime.media.format && <span className="ml-1.5">· {anime.media.format}</span>}
          </p>
        </div>
      </div>

      {/* Bell overlay, top-right */}
      <SubscribeBellButton
        anime={anime}
        className="absolute top-1 right-1 w-6 h-6"
        iconClassName="w-3 h-3"
      />
    </div>
  );
}
