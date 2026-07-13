import { useTranslation } from 'react-i18next';
import { Play, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatFuzzyDate, formatTimeUntilAiring } from '@/lib/anime-utils';
import { GenresList, TagsList } from './AnimeInfoMeta.parts';
import type { IAnimeInfoMetaProps } from './AnimeInfoMeta.types';

export default function AnimeInfoMeta({
  details,
  mainStudios,
  genres,
  nonSpoilerTags,
  cleanDescription,
  loading,
  descExpanded,
  onToggleDesc,
  language,
}: IAnimeInfoMetaProps) {
  const { t } = useTranslation('schedule');

  const hasNextEpisode = Boolean(
    details?.nextAiringEpisode &&
    details.nextAiringEpisode.timeUntilAiring != null &&
    details.nextAiringEpisode.timeUntilAiring > 0
  );

  const startDate = details ? formatFuzzyDate(details.startDate, language) : null;
  const endDate = details ? formatFuzzyDate(details.endDate, language) : null;
  const hasDates = Boolean(startDate || endDate);

  return (
    <>
      {/* Next episode countdown */}
      {hasNextEpisode && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/10">
          <Play className="w-4 h-4 text-primary shrink-0" />
          <span className="text-sm">
            <span className="font-medium">
              {t('dialog.nextEpisode.episode', {
                episode: details?.nextAiringEpisode?.episode,
              })}
            </span>
            <span className="text-muted-foreground"> {t('dialog.nextEpisode.in')} </span>
            <span className="font-medium text-primary tabular-nums">
              {formatTimeUntilAiring(details!.nextAiringEpisode!.timeUntilAiring!)}
            </span>
          </span>
        </div>
      )}

      {/* Studios */}
      {mainStudios.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-muted-foreground mb-1">{t('dialog.studios')}</h3>
          <p className="text-sm font-medium">{mainStudios.join(', ')}</p>
        </div>
      )}

      {/* Genres */}
      {genres.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-muted-foreground mb-1.5">{t('dialog.genres')}</h3>
          <GenresList genres={genres} />
        </div>
      )}

      {/* Tags */}
      {nonSpoilerTags.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-muted-foreground mb-1.5">{t('dialog.tags')}</h3>
          <TagsList tags={nonSpoilerTags} />
        </div>
      )}

      {/* Description */}
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-3/5" />
        </div>
      ) : cleanDescription ? (
        <div>
          <h3 className="text-xs font-medium text-muted-foreground mb-1.5">
            {t('dialog.description')}
          </h3>
          <p
            className={cn(
              'text-sm text-foreground/80 leading-relaxed whitespace-pre-line',
              !descExpanded && 'line-clamp-4'
            )}
          >
            {cleanDescription}
          </p>
          {cleanDescription.length > 300 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-primary h-6 px-1 mt-1"
              onClick={onToggleDesc}
            >
              {descExpanded ? (
                <>
                  <ChevronUp className="w-3 h-3" /> {t('dialog.collapse')}
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3" /> {t('dialog.expand')}
                </>
              )}
            </Button>
          )}
        </div>
      ) : null}

      {/* Dates */}
      {hasDates && (
        <div className="flex gap-6">
          {startDate && (
            <div>
              <h3 className="text-xs font-medium text-muted-foreground mb-0.5">
                {t('dialog.startDate')}
              </h3>
              <p className="text-sm tabular-nums">{startDate}</p>
            </div>
          )}
          {endDate && (
            <div>
              <h3 className="text-xs font-medium text-muted-foreground mb-0.5">
                {t('dialog.endDate')}
              </h3>
              <p className="text-sm tabular-nums">{endDate}</p>
            </div>
          )}
        </div>
      )}
    </>
  );
}
