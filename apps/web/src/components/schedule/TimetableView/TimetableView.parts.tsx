import { memo } from 'react';
import type { TFunction } from 'i18next';
import { Film } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AiringAnime } from '@shiroani/shared';
import { formatTime, getAnimeTitle, type SlotStatus } from '../schedule-utils';
import { ScheduleDayColumn } from '../ScheduleDayColumn';
import { SubscribeBellButton } from '../SubscribeBellButton';

/* ────────────── Poster grid ────────────── */

interface IPosterGridProps {
  weekDays: string[];
  weekData: Map<string, AiringAnime[]>;
  dayNamesShort: string[];
  now: number;
  onAnimeClick?: (anime: AiringAnime) => void;
  t: TFunction<'schedule'>;
}

/**
 * 7-column poster board grid — owns the `weekDays` iteration so the shell
 * stays free of in-JSX mapping. Each column delegates per-card rendering to a
 * `PosterCard` via `ScheduleDayColumn.renderCard`.
 */
export function PosterGrid({
  weekDays,
  weekData,
  dayNamesShort,
  now,
  onAnimeClick,
  t,
}: IPosterGridProps) {
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
              emptyLabel={t('timetable.emptyLabel')}
              listClassName="space-y-2"
              emptyStateClassName="py-10"
              emptyIconClassName="w-6 h-6"
              renderCard={(anime, status) => (
                <PosterCard
                  key={`${anime.id}-${anime.episode}`}
                  anime={anime}
                  status={status}
                  onClick={onAnimeClick}
                  episodeLabel={t('timetable.episodeShort', { episode: anime.episode })}
                  liveLabel={t('timetable.live')}
                />
              )}
            />
          );
        })}
      </div>
    </div>
  );
}

/* ────────────── Poster card ────────────── */

interface IPosterCardProps {
  anime: AiringAnime;
  status: SlotStatus;
  onClick?: (anime: AiringAnime) => void;
  episodeLabel: string;
  liveLabel: string;
}

const PosterCard = memo(function PosterCard({
  anime,
  status,
  onClick,
  episodeLabel,
  liveLabel,
}: IPosterCardProps) {
  const title = getAnimeTitle(anime.media);
  // Prefer high-res cover for the hero treatment
  const coverUrl = anime.media.coverImage.large || anime.media.coverImage.medium;
  const isLive = status === 'live';
  const isDone = status === 'done';

  return (
    <div
      role="article"
      aria-label={title}
      className={cn(
        'group relative rounded-[9px] overflow-hidden border border-border-glass',
        'transition-colors duration-200',
        'bg-[linear-gradient(150deg,oklch(0.45_0.14_280),oklch(0.28_0.1_330))]',
        isLive && 'border-primary/60 shadow-[0_0_18px_oklch(from_var(--primary)_l_c_h/0.35)]',
        isDone && 'opacity-55',
        onClick && 'cursor-pointer hover:border-primary/50'
      )}
      style={{ aspectRatio: '2 / 2.6' }}
    >
      {/* Primary "open" affordance — a stretched transparent button covering the
          poster. Sibling to the bell (not a wrapping role="button") so axe's
          nested-interactive rule is satisfied; the bell sits above it via z-index. */}
      {onClick && (
        <button
          type="button"
          onClick={() => onClick(anime)}
          aria-label={title}
          className="absolute inset-0 z-[1] rounded-[9px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        />
      )}

      {/* Cover image */}
      {coverUrl ? (
        <img
          src={coverUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <Film className="w-8 h-8 text-foreground/20" />
        </div>
      )}

      {/* Sheen + bottom darkening — matches mock .wp-card::after */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 30% 20%, oklch(1 0 0 / 0.18), transparent 50%), linear-gradient(180deg, transparent 40%, oklch(0 0 0 / 0.8))',
        }}
      />

      {/* Top row — time + episode chips */}
      <div className="absolute inset-x-[6px] top-[6px] flex items-center justify-between z-[2]">
        <span
          className={cn(
            'inline-flex font-mono text-[10px] font-bold tracking-[0.05em] px-[5px] py-[2px] rounded',
            isLive ? 'bg-primary text-primary-foreground' : 'bg-black/60 text-white'
          )}
        >
          {formatTime(anime.airingAt)}
        </span>
        <span className="inline-flex font-mono text-[9px] tracking-[0.05em] px-[5px] py-[2px] rounded bg-black/60 text-white">
          {episodeLabel}
        </span>
      </div>

      {/* Bell — top-right on hover */}
      <SubscribeBellButton
        anime={anime}
        className="absolute top-7 right-[6px] w-6 h-6 bg-black/40 backdrop-blur-sm z-[2]"
        iconClassName="w-3 h-3"
      />

      {/* Bottom title block */}
      <div className="absolute inset-x-[6px] bottom-[6px] z-[2]">
        <p className="text-[10.5px] font-bold leading-[1.15] text-white line-clamp-2 drop-shadow-[0_1px_3px_oklch(0_0_0/0.7)]">
          {title}
        </p>
        {isLive && (
          <p className="mt-[2px] font-mono text-[8.5px] tracking-[0.1em] text-white/90">
            {liveLabel}
          </p>
        )}
      </div>
    </div>
  );
});
