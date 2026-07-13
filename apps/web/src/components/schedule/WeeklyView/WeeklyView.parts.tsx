import { memo } from 'react';
import { Tv } from 'lucide-react';
import type { AiringAnime } from '@shiroani/shared';
import { cn } from '@/lib/utils';
import { handleImageError } from '@/lib/image-utils';
import { FadeInImage } from '@/components/shared/FadeInImage';
import { formatTime, getAnimeTitle, getCoverUrl, type SlotStatus } from '../schedule-utils';
import { ScheduleDayColumn } from '../ScheduleDayColumn';
import { SubscribeBellButton } from '../SubscribeBellButton';

type MembershipKind = 'library' | 'subscribed' | 'none';

const EMPTY_IDS: ReadonlySet<number> = new Set<number>();

interface IWeekColumnsProps {
  weekDays: string[];
  dayNamesShort: string[];
  weekData: Map<string, AiringAnime[]>;
  now: number;
  onAnimeClick?: (anime: AiringAnime) => void;
  libraryAnilistIds?: ReadonlySet<number>;
  subscribedAnilistIds?: ReadonlySet<number>;
  emptyLabel: string;
  nowLabel: string;
  episodeLabelFor: (anime: AiringAnime) => string;
}

/**
 * The 7-column week grid body. Owns the per-day iteration so the WeeklyView
 * shell stays free of in-JSX `.map`. Each column delegates per-card rendering
 * to a `WeekEventCard`.
 */
export function WeekColumns({
  weekDays,
  dayNamesShort,
  weekData,
  now,
  onAnimeClick,
  libraryAnilistIds = EMPTY_IDS,
  subscribedAnilistIds = EMPTY_IDS,
  emptyLabel,
  nowLabel,
  episodeLabelFor,
}: IWeekColumnsProps) {
  return (
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
            emptyLabel={emptyLabel}
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
                  nowLabel={nowLabel}
                  episodeLabel={episodeLabelFor(anime)}
                />
              );
            }}
          />
        );
      })}
    </div>
  );
}

/* ────────────── Event card ────────────── */

interface IWeekEventCardProps {
  anime: AiringAnime;
  status: SlotStatus;
  membership: MembershipKind;
  onClick?: (anime: AiringAnime) => void;
  nowLabel: string;
  episodeLabel: string;
}

const WeekEventCard = memo(function WeekEventCard({
  anime,
  status,
  membership,
  onClick,
  nowLabel,
  episodeLabel,
}: IWeekEventCardProps) {
  const title = getAnimeTitle(anime.media);
  const coverUrl = getCoverUrl(anime.media);
  const isLive = status === 'live';
  const isDone = status === 'done';

  const borderColor = isLive
    ? 'border-l-primary'
    : isDone
      ? 'border-l-muted-foreground/30'
      : 'border-l-status-info';

  // Top edge + subtle wash encodes library / subscription membership.
  // Library wins when both are true. Kept as a separate axis from the
  // status-driven left border (live/done/upcoming) so users can read both
  // signals at a glance.
  const membershipTint =
    membership === 'library'
      ? 'border-t-[3px] border-t-primary bg-primary/[0.06]'
      : membership === 'subscribed'
        ? 'border-t-[3px] border-t-gold bg-[oklch(from_var(--gold)_l_c_h/0.06)]'
        : '';

  return (
    <div
      role="article"
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
      {/* Primary "open" affordance — a stretched transparent button covering the
          card. Keeping it a sibling of the bell (rather than wrapping the card in
          a role="button") avoids axe's nested-interactive violation; the bell
          sits at a higher z-index so it stays independently clickable. */}
      {onClick && (
        <button
          type="button"
          onClick={() => onClick(anime)}
          aria-label={title}
          className="absolute inset-0 z-[1] rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        />
      )}

      <div className="flex gap-2">
        {/* Cover thumb — 2:3 aspect, helps users scan titles visually */}
        <div
          aria-hidden="true"
          className="w-9 h-[54px] rounded-[4px] overflow-hidden flex-shrink-0 bg-muted/30 border border-border-glass relative"
        >
          {coverUrl ? (
            <FadeInImage
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

      {/* Bell overlay, top-right — above the stretched open button (z-[1]). */}
      <SubscribeBellButton
        anime={anime}
        className="absolute top-1 right-1 z-[2] w-6 h-6"
        iconClassName="w-3 h-3"
      />
    </div>
  );
});
