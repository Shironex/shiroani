import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Play, Tv } from 'lucide-react';
import { cn } from '@/lib/utils';
import { handleImageError } from '@/lib/image-utils';
import { FadeInImage } from '@/components/shared/FadeInImage';
import { PillTag } from '@/components/ui/pill-tag';
import { formatCountdown, formatTime, getAnimeTitle, getCoverUrl } from '../schedule-utils';
import { formatEpisodeProgress } from '@/lib/anime-utils';
import { SubscribeBellButton } from '../SubscribeBellButton';
import type { IAiringEntryProps } from './AiringEntry.types';

const DOW_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

/**
 * A single airing slot rendered as a horizontal pill-shaped card.
 *
 * Anatomy (left → right):
 *   1. Status mark — 6px colored stripe (accent = live, green = soon/sub, …).
 *   2. Time block  — HH:MM + weekday label (mono, tabular).
 *   3. Cover thumb — 42×56 rounded preview (optional).
 *   4. Meta column — title, format/genre/episode chip row.
 *   5. Right cluster — countdown pill / live pill + bell subscription.
 */
const AiringEntry = memo(function AiringEntry({
  anime,
  status,
  now,
  style,
  onClick,
}: IAiringEntryProps) {
  const { t } = useTranslation('schedule');
  const { t: tCommon } = useTranslation('common');
  const title = getAnimeTitle(anime.media);
  const coverUrl = getCoverUrl(anime.media);
  const airing = new Date(anime.airingAt * 1000);
  const dow = t(`dayShort.${DOW_KEYS[airing.getDay()]}`);

  const isLive = status === 'live';
  const isDone = status === 'done';

  // Status pill variant + label
  let statusVariant: 'accent' | 'green' | 'muted' = 'muted';
  let statusLabel: string;
  if (isLive) {
    statusVariant = 'accent';
    statusLabel = t('entry.live');
  } else if (isDone) {
    statusVariant = 'muted';
    statusLabel = t('entry.watched');
  } else {
    const countdown = formatCountdown(anime.airingAt, now);
    statusLabel = countdown || t('entry.soon');
  }

  // Mark (left stripe) colour
  const markClass = isLive ? 'bg-primary' : isDone ? 'bg-muted-foreground/40' : 'bg-status-info';

  const showStatusPill = !isLive && Boolean(statusLabel);

  const ariaLabel = t('entry.ariaLabel', { title, time: formatTime(anime.airingAt) });

  return (
    <div
      role="article"
      aria-label={ariaLabel}
      style={style}
      className={cn(
        'group relative flex items-stretch gap-3 rounded-lg overflow-hidden',
        'border transition-colors duration-200',
        isLive
          ? 'bg-primary/10 border-primary/40 shadow-[0_0_18px_oklch(from_var(--primary)_l_c_h/0.25)]'
          : 'bg-card/40 border-border-glass',
        isDone && 'opacity-60',
        onClick && 'cursor-pointer hover:border-border-glass/90 hover:bg-card/60',
        onClick && isLive && 'hover:border-primary/60 hover:bg-primary/15'
      )}
    >
      {/* Primary "open" affordance — a stretched transparent button. Kept a
          sibling of the bell (not a role="button" wrapping it) so axe's
          nested-interactive rule passes; the right-action cluster sits above it. */}
      {onClick && (
        <button
          type="button"
          onClick={() => onClick(anime)}
          aria-label={ariaLabel}
          className="absolute inset-0 z-[1] rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        />
      )}

      {/* Status mark — 6px stripe */}
      <span aria-hidden="true" className={cn('w-[6px] shrink-0', markClass)} />

      {/* Time block */}
      <div className="flex flex-col justify-center min-w-[60px] shrink-0 py-2">
        <span className="font-mono text-[14px] font-bold tabular-nums text-foreground leading-none">
          {formatTime(anime.airingAt)}
        </span>
        <span className="mt-[3px] font-mono text-[9.5px] uppercase tracking-[0.1em] font-medium text-muted-foreground">
          {isLive ? t('entry.todayMarker', { day: dow }) : dow}
        </span>
      </div>

      {/* Cover thumbnail */}
      {coverUrl ? (
        <FadeInImage
          src={coverUrl}
          alt=""
          className="w-[42px] h-[56px] my-auto rounded-md object-cover border border-border-glass shrink-0"
          loading="lazy"
          onError={handleImageError}
        />
      ) : (
        <div className="w-[42px] h-[56px] my-auto rounded-md bg-muted/60 border border-border-glass shrink-0" />
      )}

      {/* Middle info block */}
      <div className="flex-1 min-w-0 py-2 pr-2 flex flex-col justify-center">
        <h4
          className="text-[13.5px] font-bold leading-[1.2] text-foreground truncate"
          title={title}
        >
          {title}
        </h4>
        <div className="mt-[3px] flex items-center gap-2 text-[11px] text-muted-foreground truncate">
          <Tv className={cn('w-3 h-3 shrink-0', isLive && 'text-primary')} />
          <span className={cn('truncate', isLive && 'text-primary font-semibold')}>
            {isLive ? t('entry.liveBadge') : anime.media.format || 'TV'}
          </span>
          <span className="text-muted-foreground/50">·</span>
          <span className="truncate">
            {formatEpisodeProgress(tCommon, anime.episode, anime.media.episodes)}
          </span>
        </div>
      </div>

      {/* Right actions — above the stretched open button (z-[1]) so the bell
          stays independently clickable. */}
      <div className="relative z-[2] flex items-center gap-2 pr-3 shrink-0">
        {showStatusPill && (
          <PillTag variant={statusVariant} className="pointer-events-none tabular-nums">
            {statusLabel}
          </PillTag>
        )}
        {isLive && (
          <span
            aria-hidden="true"
            className="pointer-events-none hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary text-primary-foreground text-[11px] font-bold"
          >
            <Play className="w-3 h-3 fill-current" strokeWidth={0} />
            {t('entry.watch')}
          </span>
        )}
        <SubscribeBellButton anime={anime} className="w-7 h-7" tooltipSide="left" />
      </div>
    </div>
  );
});

export default AiringEntry;
