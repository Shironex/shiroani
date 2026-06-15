import { useTranslation } from 'react-i18next';
import { useGenreBreakdown } from './GenreBreakdown.hooks';
import { GenreBars } from './GenreBreakdown.parts';
import type { IGenreBreakdownProps } from './GenreBreakdown.types';

/**
 * Ordered horizontal-bar breakdown of the top N watched genres.
 *
 * Mirrors the `.genre-bar` stack on the Profile mock: each row shows the
 * genre name + percentage, with a 5px pill-shaped bar underneath. Colours
 * cycle through a small palette keyed to the genre index (matching the
 * mock's hand-picked hues).
 */
export default function GenreBreakdown({ genres, limit = 5 }: IGenreBreakdownProps) {
  const { t } = useTranslation('profile');
  const { top, max } = useGenreBreakdown({ genres, limit });

  if (top.length === 0) {
    return <p className="text-[12px] text-muted-foreground/70">{t('genres.empty')}</p>;
  }

  return <GenreBars top={top} max={max} />;
}
