import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ThumbsDown, ThumbsUp } from 'lucide-react';
import type { AniListCommunityRecommendation, RecommendationRating } from '@shiroani/shared';
import { cn } from '@/lib/utils';
import { DiscoverCard } from '@/components/discover/DiscoverCard';
import { getTitle } from '@/components/discover/random/random-utils';
import type { DiscoverMedia } from '@/stores/useDiscoverStore';

interface RecommendationCardProps {
  pair: AniListCommunityRecommendation;
  inLibrary?: boolean;
  /** Whether AniList is connected — gates the thumb up/down vote buttons. */
  connected: boolean;
  onClick?: (media: DiscoverMedia) => void;
  onAddToLibrary?: (media: DiscoverMedia) => void;
  onVote?: (pair: AniListCommunityRecommendation, rating: RecommendationRating) => void;
}

/**
 * One community recommendation pairing (item C5): renders the recommended media
 * as a {@link DiscoverCard} and adds a thumb up/down vote bar plus a
 * "recommended from {source}" context line.
 *
 * The recommendation media carries a flat `coverImage: string`, but DiscoverCard
 * expects the object shape — so we map it into a minimal `DiscoverMedia` here
 * (this is the runtime-safe bridge between the two contracts).
 */
export const RecommendationCard = memo(function RecommendationCard({
  pair,
  inLibrary,
  connected,
  onClick,
  onAddToLibrary,
  onVote,
}: RecommendationCardProps) {
  const { t } = useTranslation('discover');
  const rec = pair.mediaRecommendation;

  const media = useMemo<DiscoverMedia>(
    () => ({
      id: rec.id,
      title: rec.title,
      coverImage: { large: rec.coverImage },
      format: rec.format,
      averageScore: rec.averageScore,
    }),
    [rec]
  );

  const sourceTitle = getTitle(pair.media.title);

  const handleVote = useCallback(
    (rating: RecommendationRating) => onVote?.(pair, rating),
    [onVote, pair]
  );

  const userRating = pair.userRating;

  return (
    <div className="flex flex-col gap-1.5">
      <DiscoverCard
        media={media}
        inLibrary={inLibrary}
        onClick={onClick ? () => onClick(media) : undefined}
        onAddToLibrary={onAddToLibrary}
      />

      {/* Source-context line — which anime this was recommended from. */}
      <p className="px-0.5 text-2xs text-muted-foreground/80 truncate">
        {t('recommendations.fromSource', { title: sourceTitle })}
      </p>

      {/* Vote bar — thumb up / down. Net community score in the middle. */}
      <div className="flex items-center justify-between gap-1.5 px-0.5">
        <VoteButton
          active={userRating === 'RATE_UP'}
          disabled={!connected}
          direction="up"
          label={t('recommendations.voteUp')}
          onClick={() => handleVote('RATE_UP')}
        />
        <span
          className="font-mono text-[11px] tabular-nums text-muted-foreground"
          title={t('recommendations.netScore')}
        >
          {pair.rating > 0 ? `+${pair.rating}` : pair.rating}
        </span>
        <VoteButton
          active={userRating === 'RATE_DOWN'}
          disabled={!connected}
          direction="down"
          label={t('recommendations.voteDown')}
          onClick={() => handleVote('RATE_DOWN')}
        />
      </div>
    </div>
  );
});

interface VoteButtonProps {
  active: boolean;
  disabled: boolean;
  direction: 'up' | 'down';
  label: string;
  onClick: () => void;
}

function VoteButton({ active, disabled, direction, label, onClick }: VoteButtonProps) {
  const Icon = direction === 'up' ? ThumbsUp : ThumbsDown;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={cn(
        'inline-flex items-center justify-center rounded-md p-1.5 transition-colors',
        'border border-border-glass',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        active
          ? direction === 'up'
            ? 'bg-status-success/20 text-status-success border-status-success/40'
            : 'bg-destructive/15 text-destructive border-destructive/40'
          : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5'
      )}
    >
      <Icon className="w-3.5 h-3.5" fill={active ? 'currentColor' : 'none'} strokeWidth={2} />
    </button>
  );
}
