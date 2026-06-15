import { useCallback, useState } from 'react';
import type { MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { getAnilistFormatLabel, getAnilistStatusLabel } from '@/lib/constants';
import type { IDiscoverCardProps, IDiscoverCardView } from './DiscoverCard.types';
import { getTitle } from '../random/random-utils';

export function useDiscoverCard({
  media,
  inLibrary,
  onClick,
  onAddToLibrary,
}: IDiscoverCardProps): IDiscoverCardView {
  // Re-render on language change so the format/status label getters refresh.
  useTranslation('anilist');
  const { t } = useTranslation('discover');
  const [imgError, setImgError] = useState(false);

  const handleClick = useCallback(() => onClick?.(media), [onClick, media]);

  const handleImageError = useCallback(() => setImgError(true), []);

  const handleAddClick = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      if (!inLibrary) onAddToLibrary?.(media);
    },
    [inLibrary, onAddToLibrary, media]
  );

  const coverUrl = media.coverImage.large || media.coverImage.extraLarge || media.coverImage.medium;
  const showImage = Boolean(coverUrl) && !imgError;
  const title = getTitle(media.title);
  const formatLabel = media.format ? getAnilistFormatLabel(media.format) : null;
  const statusLabel = media.status ? getAnilistStatusLabel(media.status) : null;

  const episodeInfo = media.episodes ? t('card.episodeCount', { count: media.episodes }) : null;
  const subtitle = [episodeInfo, statusLabel].filter(Boolean).join(' · ');

  const hasScore = media.averageScore != null && media.averageScore > 0;

  return {
    title,
    coverUrl,
    showImage,
    formatLabel,
    subtitle,
    hasScore,
    handleClick,
    handleImageError,
    handleAddClick,
  };
}
