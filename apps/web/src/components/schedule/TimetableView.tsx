import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Film } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getDayNamesShort } from '@/lib/constants';
import { formatTime, getAnimeTitle, type SlotStatus } from './schedule-utils';
import { ScheduleDayColumn } from './ScheduleDayColumn';
import { SubscribeBellButton } from './SubscribeBellButton';
import { useWeekData } from '@/hooks/useWeekData';
import { useNowSeconds } from '@/hooks/useNowSeconds';
import type { AiringAnime } from '@shiroani/shared';

export interface TimetableViewProps {
  weekDays: string[];
  getEntriesForDay: (day: string) => AiringAnime[];
  /** Raw schedule object so useMemo can detect changes */
  schedule: Record<string, AiringAnime[]>;
  onAnimeClick?: (anime: AiringAnime) => void;
}

/**
 * Poster board — 7 columns, one per day, each filled with cinematic poster
 * cards. Time and episode are rendered as floating mono pills on top of the
 * cover; title overlays the bottom via a dark gradient.
 *
 * Kept under the `timetable` view-mode id for store compatibility, but the
 * UI-facing label is "Plakaty" (posters).
 */
export function TimetableView({
  weekDays,
  getEntriesForDay,
  schedule,
  onAnimeClick,
}: TimetableViewProps) {
  const { i18n } = useTranslation();
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
              emptyLabel="brak plakatów"
              listClassName="space-y-2"
              emptyStateClassName="py-10"
              emptyIconClassName="w-6 h-6"
              renderCard={(anime, status) => (
                <PosterCard
                  key={`${anime.id}-${anime.episode}`}
                  anime={anime}
                  status={status}
                  onClick={onAnimeClick}
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

interface PosterCardProps {
  anime: AiringAnime;
  status: SlotStatus;
  onClick?: (anime: AiringAnime) => void;
}

function PosterCard({ anime, status, onClick }: PosterCardProps) {
  const title = getAnimeTitle(anime.media);
  // Prefer high-res cover for the hero treatment
  const coverUrl = anime.media.coverImage.large || anime.media.coverImage.medium;
  const isLive = status === 'live';
  const isDone = status === 'done';

  return (
    <div
      role={onClick ? 'button' : 'article'}
      tabIndex={onClick ? 0 : undefined}
      aria-label={title}
      onClick={onClick ? () => onClick(anime) : undefined}
      onKeyDown={
        onClick
          ? e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick(anime);
              }
            }
          : undefined
      }
      className={cn(
        'group relative rounded-[9px] overflow-hidden border border-border-glass',
        'transition-transform duration-200',
        'bg-[linear-gradient(150deg,oklch(0.45_0.14_280),oklch(0.28_0.1_330))]',
        isLive && 'border-primary/60 shadow-[0_0_18px_oklch(from_var(--primary)_l_c_h/0.35)]',
        isDone && 'opacity-55',
        onClick &&
          'cursor-pointer hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
      )}
      style={{ aspectRatio: '2 / 2.6' }}
    >
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
          EP {anime.episode}
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
          <p className="mt-[2px] font-mono text-[8.5px] tracking-[0.1em] text-white/90">▶ TERAZ</p>
        )}
      </div>
    </div>
  );
}
