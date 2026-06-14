import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { AniListErrorState } from '@/components/shared/AniListErrorState';
import { DiscoverSkeleton } from '@/components/discover/DiscoverSkeleton';
import { useRecommendationsPanel } from './RecommendationsPanel.hooks';
import { RecommendationGrid } from './RecommendationsPanel.parts';
import type { IRecommendationsPanelProps } from './RecommendationsPanel.types';

/**
 * Community recommendations tab (item C5). Browses AniList `Page.recommendations`
 * (media->media pairings sorted by net community vote), reusing DiscoverCard via
 * RecommendationCard and adding thumb up/down voting. Browse needs no auth; only
 * voting is gated on `connected`. Owns its own loading/empty/error like the
 * Random panel.
 */
function RecommendationsPanel({ libraryIds, connected, onCardClick }: IRecommendationsPanelProps) {
  const { t } = useTranslation('discover');
  const {
    recommendations,
    votingIds,
    showError,
    error,
    showSkeleton,
    isEmpty,
    handleAddToLibrary,
    handleRetry,
    handleVote,
  } = useRecommendationsPanel();

  if (showError) {
    return <AniListErrorState error={error} onRetry={handleRetry} />;
  }

  if (showSkeleton) {
    return <DiscoverSkeleton />;
  }

  if (isEmpty) {
    return (
      <EmptyState
        icon={Sparkles}
        title={t('recommendations.emptyTitle')}
        subtitle={t('recommendations.emptySubtitle')}
      />
    );
  }

  return (
    <RecommendationGrid
      recommendations={recommendations}
      libraryIds={libraryIds}
      connected={connected}
      votingIds={votingIds}
      onCardClick={onCardClick}
      onAddToLibrary={handleAddToLibrary}
      onVote={handleVote}
    />
  );
}

export default memo(RecommendationsPanel);
