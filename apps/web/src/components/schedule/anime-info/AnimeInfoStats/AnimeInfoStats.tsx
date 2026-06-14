import { useTranslation } from 'react-i18next';
import { Star, Heart, Users, Trophy, Tv, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatRawScore } from '@/lib/anime-utils';
import {
  getAnilistFormatLabel,
  getAnilistStatusLabel,
  getAnilistSourceLabel,
  getAnilistSeasonLabel,
} from '@/lib/constants';
import type { IAnimeInfoStatsProps } from './AnimeInfoStats.types';

export default function AnimeInfoStats({
  anime,
  details,
  topRanking,
  format,
  status,
  episodes,
}: IAnimeInfoStatsProps) {
  const { t } = useTranslation('schedule');
  const showSeason = Boolean(details?.season && details?.seasonYear);

  return (
    <>
      {/* Quick stats row */}
      <div className="flex flex-wrap items-center gap-2 pt-3">
        {anime.media.averageScore != null && (
          <Badge variant="secondary" className="gap-1">
            <Star className="w-3 h-3 text-yellow-500" />
            {formatRawScore(anime.media.averageScore)}
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
        {showSeason && (
          <Badge variant="outline">
            {getAnilistSeasonLabel(details?.season ?? '')} {details?.seasonYear}
          </Badge>
        )}
        {episodes && (
          <Badge variant="outline" className="gap-1">
            <Tv className="w-3 h-3" />
            {episodes} {t('dialog.episodesShort')}
          </Badge>
        )}
        {details?.duration && (
          <Badge variant="outline" className="gap-1">
            <Clock className="w-3 h-3" />
            {details.duration} {t('dialog.minutesShort')}
          </Badge>
        )}
      </div>
    </>
  );
}
