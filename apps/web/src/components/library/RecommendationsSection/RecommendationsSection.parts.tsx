import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Film, Plus, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatRawScore } from '@/lib/anime-utils';
import { useLibraryStore } from '@/stores/useLibraryStore';
import type { IRecommendationCardProps } from './RecommendationsSection.types';

const { openDetail } = useLibraryStore.getState();

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="block font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">
      {children}
    </span>
  );
}

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
        'group/rec relative shrink-0 w-24 text-left',
        'rounded-md overflow-hidden border border-border-glass bg-background/40',
        'transition-colors hover:border-primary/40',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
      )}
    >
      <div className="relative aspect-[2/3] overflow-hidden">
        {cover ? (
          <img src={cover} alt={title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full bg-muted/50 flex items-center justify-center">
            <Film className="w-5 h-5 text-muted-foreground/40" />
          </div>
        )}

        {/* Score chip — top-right */}
        {node.averageScore != null && node.averageScore > 0 && (
          <div className="absolute top-1 right-1 z-[2] flex items-center gap-[2px] px-[5px] py-[2px] rounded-[3px] bg-black/70 text-[9px] font-mono font-bold leading-none text-[oklch(0.8_0.14_70)]">
            <Star className="w-2.5 h-2.5 fill-current" strokeWidth={0} />
            <span className="tabular-nums">{formatRawScore(node.averageScore)}</span>
          </div>
        )}

        {/* In-library / add affordance — bottom-left badge */}
        <div className="absolute bottom-1 left-1 z-[2]">
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

      <p className="px-1.5 py-1 text-[11px] font-semibold leading-[1.2] line-clamp-2 text-foreground/90">
        {title}
      </p>
    </button>
  );
});
