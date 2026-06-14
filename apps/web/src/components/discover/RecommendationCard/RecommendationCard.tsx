import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { DiscoverCard } from '@/components/discover/DiscoverCard';
import { useRecommendationCard } from './RecommendationCard.hooks';
import { VoteButton } from './RecommendationCard.parts';
import type { IRecommendationCardProps } from './RecommendationCard.types';

/**
 * One community recommendation pairing (item C5): renders the recommended media
 * as a {@link DiscoverCard} and adds a thumb up/down vote bar plus a
 * "recommended from {source}" context line.
 *
 * The recommendation media carries a flat `coverImage: string`, but DiscoverCard
 * expects the object shape — so we map it into a minimal `DiscoverMedia` here
 * (this is the runtime-safe bridge between the two contracts).
 */
function RecommendationCard({
  pair,
  inLibrary,
  connected,
  isVoting = false,
  onClick,
  onAddToLibrary,
  onVote,
}: IRecommendationCardProps) {
  const { t } = useTranslation('discover');
  const { media, sourceTitle, userRating, handleVote } = useRecommendationCard({ pair, onVote });

  return (
    <div className="flex flex-col gap-1.5">
      <DiscoverCard
        media={media}
        inLibrary={inLibrary}
        onClick={onClick}
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
          disabled={!connected || isVoting}
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
          disabled={!connected || isVoting}
          direction="down"
          label={t('recommendations.voteDown')}
          onClick={() => handleVote('RATE_DOWN')}
        />
      </div>
    </div>
  );
}

export default memo(RecommendationCard);
