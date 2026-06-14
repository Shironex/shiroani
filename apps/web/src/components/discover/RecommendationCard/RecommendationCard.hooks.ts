import { useCallback, useMemo } from 'react';
import type { RecommendationRating } from '@shiroani/shared';
import type { DiscoverMedia } from '@/stores/useDiscoverStore';
import { getTitle } from '@/components/discover/random/random-utils';
import type { IRecommendationCardProps, IRecommendationCardView } from './RecommendationCard.types';

export function useRecommendationCard({
  pair,
  onVote,
}: Pick<IRecommendationCardProps, 'pair' | 'onVote'>): IRecommendationCardView {
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

  return { media, sourceTitle, userRating: pair.userRating, handleVote };
}
