import { useTranslation } from 'react-i18next';
import { useRecommendationsSection } from './RecommendationsSection.hooks';
import { FieldLabel, RecommendationCard } from './RecommendationsSection.parts';
import type { IRecommendationsSectionProps } from './RecommendationsSection.types';

/**
 * "Więcej takich" — a horizontal scrollable row of AniList recommendations.
 * Each card is an AniList media that may or may not be in the user's library:
 * already-in-library cards open that entry's detail, the rest add to the library
 * via the shared {@link useAddDiscoverMediaToLibrary} flow (dedupe + toast DRY).
 *
 * PERF: image-heavy scrollable row — the repeated poster cards intentionally
 * avoid hover-scale / translate / will-change / backdrop-blur.
 */
export default function RecommendationsSection(props: IRecommendationsSectionProps) {
  const { t } = useTranslation('library');
  const { nodes, entryByAnilistId, addToLibrary } = useRecommendationsSection(props);

  if (nodes.length === 0) return null;

  const cards = nodes.map(node => (
    <RecommendationCard
      key={node.id}
      node={node}
      libraryEntry={entryByAnilistId.get(node.id)}
      onAdd={addToLibrary}
    />
  ));

  return (
    <div className="space-y-2">
      <FieldLabel>{t('recommendations.title')}</FieldLabel>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">{cards}</div>
    </div>
  );
}
