import { useTranslation } from 'react-i18next';
import { SectionLabel } from '../SectionLabel';
import { useAnimeInfoRecommendations } from './AnimeInfoRecommendations.hooks';
import { RecommendationsList } from './AnimeInfoRecommendations.parts';
import type { IAnimeInfoRecommendationsProps } from './AnimeInfoRecommendations.types';

/**
 * "Więcej takich" — AniList recommendations row in the schedule info dialog.
 * Mirrors the library RecommendationsSection behavior (add not-in-library media
 * via the shared flow) but uses the schedule dialog's visual vocabulary.
 *
 * PERF: image-heavy scrollable row — repeated poster cards avoid hover-scale.
 */
export default function AnimeInfoRecommendations({ details }: IAnimeInfoRecommendationsProps) {
  const { t } = useTranslation('schedule');
  const { nodes, inLibraryIds, addToLibrary } = useAnimeInfoRecommendations(details);

  if (nodes.length === 0) return null;

  return (
    <div>
      <SectionLabel className="mb-2">{t('dialog.recommendations')}</SectionLabel>
      <RecommendationsList nodes={nodes} inLibraryIds={inLibraryIds} onAdd={addToLibrary} />
    </div>
  );
}
