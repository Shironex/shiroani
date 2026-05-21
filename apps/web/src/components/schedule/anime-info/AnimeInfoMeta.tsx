import { useTranslation } from 'react-i18next';
import { Play, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatFuzzyDate, formatTimeUntilAiring } from '@/lib/anime-utils';
import type { AnimeDetail, AnimeDetailTag } from '@shiroani/shared';

interface AnimeInfoMetaProps {
  details: AnimeDetail | null;
  mainStudios: string[];
  genres: string[];
  nonSpoilerTags: AnimeDetailTag[];
  cleanDescription?: string;
  loading: boolean;
  descExpanded: boolean;
  onToggleDesc: () => void;
  language: string;
}

export function AnimeInfoMeta({
  details,
  mainStudios,
  genres,
  nonSpoilerTags,
  cleanDescription,
  loading,
  descExpanded,
  onToggleDesc,
  language,
}: AnimeInfoMetaProps) {
  const { t } = useTranslation('schedule');

  return (
    <>
      {/* Next episode countdown */}
      {details?.nextAiringEpisode &&
        details.nextAiringEpisode.timeUntilAiring != null &&
        details.nextAiringEpisode.timeUntilAiring > 0 && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/10">
            <Play className="w-4 h-4 text-primary shrink-0" />
            <span className="text-sm">
              <span className="font-medium">
                {t('dialog.nextEpisode.episode', {
                  episode: details.nextAiringEpisode.episode,
                })}
              </span>
              <span className="text-muted-foreground"> {t('dialog.nextEpisode.in')} </span>
              <span className="font-medium text-primary">
                {formatTimeUntilAiring(details.nextAiringEpisode.timeUntilAiring!)}
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
          <div className="flex flex-wrap gap-1">
            {genres.map(genre => (
              <Badge key={genre} variant="secondary" className="text-xs">
                {genre}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Tags */}
      {nonSpoilerTags.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-muted-foreground mb-1.5">{t('dialog.tags')}</h3>
          <div className="flex flex-wrap gap-1">
            {nonSpoilerTags.map(tag => (
              <Badge key={tag.id} variant="outline" className="text-2xs">
                {tag.name}
                {tag.rank != null && (
                  <span className="text-muted-foreground ml-1">{tag.rank}%</span>
                )}
              </Badge>
            ))}
          </div>
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
      {details &&
        (formatFuzzyDate(details.startDate, language) ||
          formatFuzzyDate(details.endDate, language)) && (
          <div className="flex gap-6">
            {formatFuzzyDate(details.startDate, language) && (
              <div>
                <h3 className="text-xs font-medium text-muted-foreground mb-0.5">
                  {t('dialog.startDate')}
                </h3>
                <p className="text-sm tabular-nums">
                  {formatFuzzyDate(details.startDate, language)}
                </p>
              </div>
            )}
            {formatFuzzyDate(details.endDate, language) && (
              <div>
                <h3 className="text-xs font-medium text-muted-foreground mb-0.5">
                  {t('dialog.endDate')}
                </h3>
                <p className="text-sm tabular-nums">{formatFuzzyDate(details.endDate, language)}</p>
              </div>
            )}
          </div>
        )}
    </>
  );
}
