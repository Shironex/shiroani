import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ExternalLink,
  Star,
  Heart,
  Users,
  Clock,
  Tv,
  Play,
  Trophy,
  ChevronDown,
  ChevronUp,
  Bell,
  BellRing,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  formatScore,
  getAnimeTitle,
  formatFuzzyDate,
  formatTimeUntilAiring,
} from '@/lib/anime-utils';
import {
  getAnilistFormatLabel,
  getAnilistStatusLabel,
  getAnilistSourceLabel,
  getAnilistSeasonLabel,
  getAnilistRelationLabel,
} from '@/lib/constants';
import { emitAsync } from '@/lib/socketHelpers';
import { useNavigateToBrowser } from '@/hooks/useNavigateToBrowser';
import { useNotificationToggle } from '@/hooks/useNotificationToggle';
import type { AiringAnime, AnimeDetail } from '@shiroani/shared';
import { AnimeEvents } from '@shiroani/shared';

// ============================================
// Sub-components
// ============================================

/** Reusable avatar + name + subtitle card used for characters and staff */
function PersonCard({
  imageUrl,
  name,
  subtitle,
}: {
  imageUrl?: string;
  name: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-2 p-1.5 rounded-lg bg-muted/30">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={name}
          className="w-8 h-8 rounded-full object-cover shrink-0"
          loading="lazy"
        />
      ) : (
        <div className="w-8 h-8 rounded-full bg-muted shrink-0" />
      )}
      <div className="min-w-0">
        <p className="text-xs font-medium truncate">{name}</p>
        <p className="text-2xs text-muted-foreground truncate">{subtitle}</p>
      </div>
    </div>
  );
}

// ============================================
// Main component
// ============================================

interface AnimeInfoDialogProps {
  anime: AiringAnime | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AnimeInfoDialog({ anime, open, onOpenChange }: AnimeInfoDialogProps) {
  // Subscribe to language changes so the imperative anilist label getters
  // re-evaluate on the next render when the user switches language.
  const { i18n } = useTranslation('anilist');
  const [details, setDetails] = useState<AnimeDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const navigateToBrowser = useNavigateToBrowser();
  const { isSubscribed, toggle } = useNotificationToggle(
    anime?.media.id ?? 0,
    anime as AiringAnime
  );

  const fetchDetails = useCallback(async (anilistId: number) => {
    setLoading(true);
    setDetails(null);
    setDescExpanded(false);
    try {
      const response = await emitAsync<{ anilistId: number }, { anime: AnimeDetail }>(
        AnimeEvents.GET_DETAILS,
        { anilistId }
      );
      setDetails(response.anime);
    } catch {
      // silently fail — we still show basic info from the schedule entry
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && anime) {
      fetchDetails(anime.media.id);
    }
    if (!open) {
      setDetails(null);
    }
  }, [open, anime, fetchDetails]);

  const title = useMemo(() => {
    if (!anime) return '';
    return getAnimeTitle(anime.media);
  }, [anime]);

  const mainStudios = useMemo(() => {
    if (!details?.studios?.edges) return [];
    return details.studios.edges.filter(e => e.isMain).map(e => e.node.name);
  }, [details]);

  const nonSpoilerTags = useMemo(() => {
    if (!details?.tags) return [];
    return details.tags.filter(t => !t.isGeneralSpoiler && !t.isMediaSpoiler).slice(0, 12);
  }, [details]);

  const streamingLinks = useMemo(() => {
    if (!details?.externalLinks) return [];
    return details.externalLinks.filter(l => l.type === 'STREAMING');
  }, [details]);

  const topRanking = useMemo(() => {
    if (!details?.rankings) return null;
    return (
      details.rankings.find(r => r.allTime && r.type === 'RATED') ??
      details.rankings.find(r => r.allTime && r.type === 'POPULAR') ??
      details.rankings[0] ??
      null
    );
  }, [details]);

  if (!anime) return null;

  const coverUrl =
    details?.coverImage?.extraLarge ??
    details?.coverImage?.large ??
    anime.media.coverImage.large ??
    anime.media.coverImage.medium;
  const bannerUrl = details?.bannerImage;
  const accentColor = details?.coverImage?.color;
  const format = details?.format ?? anime.media.format;
  const status = details?.status ?? anime.media.status;
  const episodes = details?.episodes ?? anime.media.episodes;
  const genres = details?.genres ?? anime.media.genres;
  const cleanDescription = details?.description
    ?.replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0"
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>

        {/* Banner */}
        <div className="relative h-44 overflow-hidden rounded-t-lg shrink-0">
          {bannerUrl ? (
            <img src={bannerUrl} alt="" className="w-full h-full object-cover" />
          ) : coverUrl ? (
            <img
              src={coverUrl}
              alt=""
              className="w-full h-full object-cover blur-md scale-110 opacity-50"
            />
          ) : (
            <div
              className="w-full h-full"
              style={{ backgroundColor: accentColor ?? 'hsl(var(--muted))' }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />

          {/* Cover + Title overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4 flex items-end gap-4">
            {coverUrl && (
              <img
                src={coverUrl}
                alt={title}
                className="w-20 h-28 rounded-lg object-cover shadow-xl border border-border/50 shrink-0"
              />
            )}
            <div className="min-w-0 flex-1 pb-1">
              <h2 className="text-lg font-bold leading-tight text-foreground drop-shadow-sm line-clamp-2">
                {title}
              </h2>
              {details?.title?.english && details.title.english !== title && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {details.title.english}
                </p>
              )}
              {details?.title?.native && (
                <p className="text-xs text-muted-foreground/70 mt-0.5 truncate">
                  {details.title.native}
                </p>
              )}
            </div>

            {/* Bell button — plain button without tooltip to avoid auto-show on dialog open */}
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 w-8 h-8 bg-background/60 backdrop-blur-sm"
              onClick={toggle}
            >
              {isSubscribed ? (
                <BellRing className="w-3.5 h-3.5 text-primary" />
              ) : (
                <Bell className="w-3.5 h-3.5" />
              )}
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="px-5 pb-5 space-y-4">
          {/* Quick stats row */}
          <div className="flex flex-wrap items-center gap-2 pt-3">
            {anime.media.averageScore != null && (
              <Badge variant="secondary" className="gap-1">
                <Star className="w-3 h-3 text-yellow-500" />
                {formatScore(anime.media.averageScore)}
              </Badge>
            )}
            {details?.popularity != null && (
              <Badge variant="secondary" className="gap-1">
                <Heart className="w-3 h-3 text-pink-500" />
                {details.popularity.toLocaleString()}
              </Badge>
            )}
            {details?.favourites != null && (
              <Badge variant="secondary" className="gap-1">
                <Users className="w-3 h-3" />
                {details.favourites.toLocaleString()}
              </Badge>
            )}
            {topRanking && (
              <Badge variant="secondary" className="gap-1">
                <Trophy className="w-3 h-3 text-amber-500" />#{topRanking.rank} {topRanking.context}
              </Badge>
            )}
          </div>

          {/* Info badges */}
          <div className="flex flex-wrap gap-1.5">
            {format && <Badge variant="outline">{getAnilistFormatLabel(format)}</Badge>}
            {status && <Badge variant="outline">{getAnilistStatusLabel(status)}</Badge>}
            {details?.source && (
              <Badge variant="outline">{getAnilistSourceLabel(details.source)}</Badge>
            )}
            {details?.season && details?.seasonYear && (
              <Badge variant="outline">
                {getAnilistSeasonLabel(details.season)} {details.seasonYear}
              </Badge>
            )}
            {episodes && (
              <Badge variant="outline" className="gap-1">
                <Tv className="w-3 h-3" />
                {episodes} odc.
              </Badge>
            )}
            {details?.duration && (
              <Badge variant="outline" className="gap-1">
                <Clock className="w-3 h-3" />
                {details.duration} min
              </Badge>
            )}
          </div>

          {/* Next episode countdown */}
          {details?.nextAiringEpisode &&
            details.nextAiringEpisode.timeUntilAiring != null &&
            details.nextAiringEpisode.timeUntilAiring > 0 && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/10">
                <Play className="w-4 h-4 text-primary shrink-0" />
                <span className="text-sm">
                  <span className="font-medium">Odc. {details.nextAiringEpisode.episode}</span>
                  <span className="text-muted-foreground"> za </span>
                  <span className="font-medium text-primary">
                    {formatTimeUntilAiring(details.nextAiringEpisode.timeUntilAiring!)}
                  </span>
                </span>
              </div>
            )}

          {/* Studios */}
          {mainStudios.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-muted-foreground mb-1">Studia</h3>
              <p className="text-sm font-medium">{mainStudios.join(', ')}</p>
            </div>
          )}

          {/* Genres */}
          {genres.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-muted-foreground mb-1.5">Gatunki</h3>
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
              <h3 className="text-xs font-medium text-muted-foreground mb-1.5">Tagi</h3>
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
              <h3 className="text-xs font-medium text-muted-foreground mb-1.5">Opis</h3>
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
                  onClick={() => setDescExpanded(v => !v)}
                >
                  {descExpanded ? (
                    <>
                      <ChevronUp className="w-3 h-3" /> Zwiń
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3 h-3" /> Rozwiń
                    </>
                  )}
                </Button>
              )}
            </div>
          ) : null}

          {/* Dates */}
          {details &&
            (formatFuzzyDate(details.startDate, i18n.language) ||
              formatFuzzyDate(details.endDate, i18n.language)) && (
              <div className="flex gap-6">
                {formatFuzzyDate(details.startDate, i18n.language) && (
                  <div>
                    <h3 className="text-xs font-medium text-muted-foreground mb-0.5">Start</h3>
                    <p className="text-sm tabular-nums">
                      {formatFuzzyDate(details.startDate, i18n.language)}
                    </p>
                  </div>
                )}
                {formatFuzzyDate(details.endDate, i18n.language) && (
                  <div>
                    <h3 className="text-xs font-medium text-muted-foreground mb-0.5">Koniec</h3>
                    <p className="text-sm tabular-nums">
                      {formatFuzzyDate(details.endDate, i18n.language)}
                    </p>
                  </div>
                )}
              </div>
            )}

          {/* Characters */}
          {details?.characters?.edges && details.characters.edges.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-muted-foreground mb-2">Postacie</h3>
              <div className="grid grid-cols-2 gap-2">
                {details.characters.edges.slice(0, 6).map(char => (
                  <PersonCard
                    key={char.node.id}
                    imageUrl={char.node.image?.medium}
                    name={char.node.name.userPreferred ?? char.node.name.full ?? ''}
                    subtitle={char.role?.toLowerCase() ?? ''}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Staff */}
          {details?.staff?.edges && details.staff.edges.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-muted-foreground mb-2">Twórcy</h3>
              <div className="grid grid-cols-2 gap-2">
                {details.staff.edges.slice(0, 4).map(staff => (
                  <PersonCard
                    key={`${staff.node.id}-${staff.role}`}
                    imageUrl={staff.node.image?.medium}
                    name={staff.node.name.userPreferred ?? staff.node.name.full ?? ''}
                    subtitle={staff.role}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Relations */}
          {details?.relations?.edges && details.relations.edges.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-muted-foreground mb-2">Powiązane</h3>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {details.relations.edges.slice(0, 8).map(rel => (
                  <div
                    key={`${rel.node.id}-${rel.relationType}`}
                    className="shrink-0 w-24 text-center"
                  >
                    {rel.node.coverImage?.medium ? (
                      <img
                        src={rel.node.coverImage.medium}
                        alt={rel.node.title.romaji ?? rel.node.title.english ?? ''}
                        className="w-full aspect-[3/4] rounded-lg object-cover border border-border/50"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full aspect-[3/4] rounded-lg bg-muted border border-border/50" />
                    )}
                    <p className="text-2xs text-primary mt-1">
                      {getAnilistRelationLabel(rel.relationType)}
                    </p>
                    <p className="text-2xs font-medium truncate mt-0.5">
                      {rel.node.title.romaji ?? rel.node.title.english}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trailer */}
          {details?.trailer?.id && details.trailer.site === 'youtube' && (
            <div>
              <h3 className="text-xs font-medium text-muted-foreground mb-2">Zwiastun</h3>
              <div className="relative aspect-video rounded-lg overflow-hidden border border-border/50">
                <iframe
                  src={`https://www.youtube.com/embed/${details.trailer.id}`}
                  title="Zwiastun"
                  className="absolute inset-0 w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          )}

          {/* Streaming links */}
          {streamingLinks.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-muted-foreground mb-1.5">Gdzie oglądać</h3>
              <div className="flex flex-wrap gap-1.5">
                {streamingLinks.map(link => (
                  <Button
                    key={link.url}
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1.5"
                    onClick={() => {
                      navigateToBrowser(link.url);
                      onOpenChange(false);
                    }}
                  >
                    {link.icon && <img src={link.icon} alt="" className="w-3.5 h-3.5" />}
                    {link.site}
                    <ExternalLink className="w-3 h-3 text-muted-foreground" />
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* AniList link — opens in the in-app browser */}
          {details?.siteUrl && (
            <div className="pt-1">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5 w-full"
                onClick={() => {
                  navigateToBrowser(details.siteUrl);
                  onOpenChange(false);
                }}
              >
                Otwórz w AniList
                <ExternalLink className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
