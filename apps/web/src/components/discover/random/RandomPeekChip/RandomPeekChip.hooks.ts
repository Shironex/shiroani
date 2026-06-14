import { useTranslation } from 'react-i18next';
import { getTitle } from '../random-utils';
import type { IRandomPeekChipProps, IRandomPeekChipView } from './RandomPeekChip.types';

export function useRandomPeekChip({
  media,
  direction,
}: Pick<IRandomPeekChipProps, 'media' | 'direction'>): IRandomPeekChipView {
  const { t } = useTranslation('discover');
  const cover = media.coverImage.medium || media.coverImage.large;
  const title = getTitle(media.title);
  const ariaLabel = t('random.peekLabel', {
    direction: direction === 'prev' ? t('random.previousLabel') : t('random.nextLabel'),
    title,
  });
  const arrowLabel = direction === 'prev' ? t('random.previousArrow') : t('random.nextArrow');

  return { cover, title, ariaLabel, arrowLabel };
}
