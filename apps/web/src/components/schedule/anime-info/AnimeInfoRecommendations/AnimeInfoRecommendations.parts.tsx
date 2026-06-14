import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Plus, Star } from 'lucide-react';
import { formatRawScore } from '@/lib/anime-utils';
import type {
  IRecommendationCardProps,
  IRecommendationsListProps,
} from './AnimeInfoRecommendations.types';

export const RecommendationCard = memo(function RecommendationCard({
  node,
  inLibrary,
  onAdd,
}: IRecommendationCardProps) {
  const { t } = useTranslation('schedule');
  const title = node.title.romaji || `#${node.id}`;

  const handleClick = useCallback(() => {
    if (inLibrary) return;
    onAdd({
      id: node.id,
      title: { romaji: node.title.romaji },
      coverImage: { medium: node.coverImage?.medium },
      format: node.format,
      averageScore: node.averageScore,
    });
  }, [inLibrary, node, onAdd]);

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={inLibrary}
      aria-label={
        inLibrary
          ? t('dialog.recommendationInLibrary', { title })
          : t('dialog.recommendationAdd', { title })
      }
      className="group/rec relative shrink-0 w-24 text-center focus-visible:outline-none"
    >
      <div className="relative">
        {node.coverImage?.medium ? (
          <img
            src={node.coverImage.medium}
            alt={title}
            className="w-full aspect-[3/4] rounded-lg object-cover border border-border/50 group-focus-visible/rec:ring-2 group-focus-visible/rec:ring-ring"
            loading="lazy"
          />
        ) : (
          <div className="w-full aspect-[3/4] rounded-lg bg-muted border border-border/50" />
        )}

        {node.averageScore != null && node.averageScore > 0 && (
          <div className="absolute top-1 right-1 flex items-center gap-[2px] px-[5px] py-[2px] rounded-[3px] bg-black/70 text-[9px] font-mono font-bold leading-none text-[oklch(0.8_0.14_70)]">
            <Star className="w-2.5 h-2.5 fill-current" strokeWidth={0} />
            <span className="tabular-nums">{formatRawScore(node.averageScore)}</span>
          </div>
        )}

        <div className="absolute bottom-1 left-1">
          {inLibrary ? (
            <div className="w-5 h-5 rounded-full bg-status-success flex items-center justify-center shadow-[0_1px_4px_oklch(0_0_0/0.5)]">
              <Check className="w-3 h-3 text-white" />
            </div>
          ) : (
            <div className="w-5 h-5 rounded-full bg-primary/90 flex items-center justify-center shadow-[0_1px_4px_oklch(0_0_0/0.5)] opacity-0 transition-opacity group-hover/rec:opacity-100 group-focus-visible/rec:opacity-100">
              <Plus className="w-3 h-3 text-primary-foreground" />
            </div>
          )}
        </div>
      </div>
      <p className="text-2xs font-medium truncate mt-1">{title}</p>
    </button>
  );
});

/** Horizontal scroll row mapping recommendation nodes to cards. */
export function RecommendationsList({ nodes, inLibraryIds, onAdd }: IRecommendationsListProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {nodes.map(node => (
        <RecommendationCard
          key={node.id}
          node={node}
          inLibrary={inLibraryIds.has(node.id)}
          onAdd={onAdd}
        />
      ))}
    </div>
  );
}
