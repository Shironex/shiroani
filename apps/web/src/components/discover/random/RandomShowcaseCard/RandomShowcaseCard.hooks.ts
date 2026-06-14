import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { buildShowcaseMeta } from '../random-utils';
import type { IRandomShowcaseCardProps, IRandomShowcaseCardView } from './RandomShowcaseCard.types';

export function useRandomShowcaseCard({
  media,
  inLibrary,
  onAddToLibrary,
}: Pick<
  IRandomShowcaseCardProps,
  'media' | 'inLibrary' | 'onAddToLibrary'
>): IRandomShowcaseCardView {
  // Re-render on language change so showcase meta labels refresh.
  useTranslation('anilist');
  const meta = buildShowcaseMeta(media);
  const showRomaji = Boolean(media.title.romaji && media.title.romaji !== meta.title);

  // Track per-id image loading so we show a blurred LQIP + skeleton while the
  // large cover downloads after navigating to a new pick.
  const [imgLoaded, setImgLoaded] = useState(false);
  useEffect(() => {
    setImgLoaded(false);
  }, [media.id]);
  const lqip = media.coverImage.medium;

  const showLqip = Boolean(lqip && lqip !== meta.cover);
  const showSkeletonShimmer = (!lqip || lqip === meta.cover) && !imgLoaded;
  const hasScore = media.averageScore != null && media.averageScore > 0;
  const genres = media.genres ? media.genres.slice(0, 6) : [];
  const hasGenres = genres.length > 0;
  const showAddButton = Boolean(onAddToLibrary) && !inLibrary;

  return {
    meta,
    lqip,
    showRomaji,
    imgLoaded,
    setImgLoaded,
    showLqip,
    showSkeletonShimmer,
    hasScore,
    hasGenres,
    genres,
    showAddButton,
  };
}
