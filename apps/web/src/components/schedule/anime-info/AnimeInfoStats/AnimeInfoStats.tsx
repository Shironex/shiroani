import { useTranslation } from 'react-i18next';
import { Star, Heart, Users, Trophy, Tv, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PillTag } from '@/components/ui/pill-tag';
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
      {/* Quick stats row — counts stay as Badges */}
      <div className="flex flex-wrap items-center gap-2 pt-3">
        {anime.media.averageScore != null && (
          <Badge variant="secondary" className="gap-1 tabular-nums">
            <Star className="w-3 h-3 text-(--gold)" />
            {formatRawScore(anime.media.averageScore)}
          </Badge>
        )}
        {details?.popularity != null && (
          <Badge variant="secondary" className="gap-1 tabular-nums">
            <Heart className="w-3 h-3 text-status-error" />
            {details.popularity.toLocaleString()}
          </Badge>
        )}
        {details?.favourites != null && (
          <Badge variant="secondary" className="gap-1 tabular-nums">
            <Users className="w-3 h-3" />
            {details.favourites.toLocaleString()}
          </Badge>
        )}
        {topRanking && (
          <Badge variant="secondary" className="gap-1 tabular-nums">
            <Trophy className="w-3 h-3 text-status-pending" />#{topRanking.rank}{' '}
            {topRanking.context}
          </Badge>
        )}
      </div>

      {/* Format / status / season row — unified on the card-layer PillTag */}
      <div className="flex flex-wrap gap-1.5">
        {format && <PillTag variant="muted">{getAnilistFormatLabel(format)}</PillTag>}
        {status && <PillTag variant="muted">{getAnilistStatusLabel(status)}</PillTag>}
        {details?.source && (
          <PillTag variant="muted">{getAnilistSourceLabel(details.source)}</PillTag>
        )}
        {showSeason && (
          <PillTag variant="muted">
            {getAnilistSeasonLabel(details?.season ?? '')} {details?.seasonYear}
          </PillTag>
        )}
        {episodes && (
          <PillTag variant="muted" className="gap-1">
            <Tv className="w-3 h-3" />
            {episodes} {t('dialog.episodesShort')}
          </PillTag>
        )}
        {details?.duration && (
          <PillTag variant="muted" className="gap-1">
            <Clock className="w-3 h-3" />
            {details.duration} {t('dialog.minutesShort')}
          </PillTag>
        )}
      </div>
    </>
  );
}
