import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { AniListCommunityRecommendation, RecommendationRating } from '@shiroani/shared';
import { useDiscoverStore } from '@/stores/useDiscoverStore';
import { useAddDiscoverMediaToLibrary } from '@/components/discover/useAddDiscoverMediaToLibrary';
import type { IRecommendationsPanelView } from './RecommendationsPanel.types';

export function useRecommendationsPanel(): IRecommendationsPanelView {
  const { t } = useTranslation('discover');
  const recommendations = useDiscoverStore(s => s.recommendations);
  const isLoading = useDiscoverStore(s => s.isRecommendationsLoading);
  // Recommendation-scoped error so an unrelated browse/search failure can't
  // replace this tab's cached results with someone else's error state.
  const error = useDiscoverStore(s => s.recommendationsError);
  const votingIds = useDiscoverStore(s => s.votingIds);

  const handleAddToLibrary = useAddDiscoverMediaToLibrary();

  const handleRetry = useCallback(() => {
    useDiscoverStore.getState().fetchRecommendations();
  }, []);

  const handleVote = useCallback(
    (pair: AniListCommunityRecommendation, rating: RecommendationRating) => {
      void useDiscoverStore
        .getState()
        .voteRecommendation(pair, rating)
        .catch(() => {
          toast.error(t('recommendations.voteFailed'));
        });
    },
    [t]
  );

  const showError = Boolean(error) && !isLoading;
  const showSkeleton = isLoading && recommendations.length === 0;
  const isEmpty = recommendations.length === 0;

  return {
    recommendations,
    votingIds,
    showError,
    error,
    showSkeleton,
    isEmpty,
    handleAddToLibrary,
    handleRetry,
    handleVote,
  };
}
