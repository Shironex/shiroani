import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Film, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FadeInImage } from '@/components/shared/FadeInImage';
import { ScoreChip } from '@/components/shared/ScoreChip';
import { formatRawScore } from '@/lib/anime-utils';
import { useLibraryStore } from '@/stores/useLibraryStore';
import type { IRecommendationCardProps } from './RecommendationsSection.types';

const { openDetail } = useLibraryStore.getState();

export const RecommendationCard = memo(function RecommendationCard({
  node,
  libraryEntry,
  onAdd,
}: IRecommendationCardProps) {
  const { t } = useTranslation('library');
  const inLibrary = !!libraryEntry;
  const title = node.title.romaji || `#${node.id}`;
  const cover = node.coverImage?.medium;

  const handleClick = useCallback(() => {
    if (libraryEntry) {
      openDetail(libraryEntry);
      return;
    }
    // Adapt the recommendation node into the minimal DiscoverMedia shape the
    // shared add-flow expects — optional fields satisfy the type.
    onAdd({
      id: node.id,
      title: { romaji: node.title.romaji },
      coverImage: { medium: node.coverImage?.medium },
      format: node.format,
      averageScore: node.averageScore,
    });
  }, [libraryEntry, node, onAdd]);

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={
        inLibrary
          ? t('recommendations.openInLibrary', { title })
          : t('recommendations.addToLibrary', { title })
      }
      className={cn(
        'group/rec relative shrink-0 w-24 text-left snap-start',
        'rounded-md overflow-hidden border border-border-glass bg-background/40',
        'transition-colors hover:border-primary/40',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
      )}
    >
      <div className="relative aspect-[2/3] overflow-hidden">
        {cover ? (
          <FadeInImage
            src={cover}
            alt={title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-muted/50 flex items-center justify-center">
            <Film className="w-5 h-5 text-muted-foreground/40" />
          </div>
        )}

        {/* Score chip — top-right */}
        {node.averageScore != null && node.averageScore > 0 && (
          <ScoreChip
            value={formatRawScore(node.averageScore)}
            scrim
            className="absolute top-1 right-1 z-[2]"
          />
        )}

        {/* In-library / add affordance — bottom-left badge */}
        <div className="absolute bottom-1 left-1 z-[2]">
          {inLibrary ? (
            <div className="w-5 h-5 rounded-full bg-status-success flex items-center justify-center shadow-[0_1px_4px_oklch(0_0_0/0.5)]">
              <Check className="w-3 h-3 text-background" />
            </div>
          ) : (
            <div className="w-5 h-5 rounded-full bg-primary/90 flex items-center justify-center shadow-[0_1px_4px_oklch(0_0_0/0.5)] opacity-0 transition-opacity group-hover/rec:opacity-100 group-focus-visible/rec:opacity-100">
              <Plus className="w-3 h-3 text-primary-foreground" />
            </div>
          )}
        </div>
      </div>

      <p className="px-1.5 py-1 text-[11px] font-semibold leading-[1.2] line-clamp-2 text-foreground/90">
        {title}
      </p>
    </button>
  );
});
