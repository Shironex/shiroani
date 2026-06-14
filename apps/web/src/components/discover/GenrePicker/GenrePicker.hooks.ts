import { useCallback } from 'react';
import type { AnimeGenre } from '@shiroani/shared';
import type { GenreState, IGenrePickerProps, IGenrePickerView } from './GenrePicker.types';

export function useGenrePicker({
  included,
  excluded,
  onChange,
}: Pick<IGenrePickerProps, 'included' | 'excluded' | 'onChange'>): IGenrePickerView {
  const cycle = useCallback(
    (genre: AnimeGenre, direction: 'forward' | 'exclude') => {
      const isIn = included.includes(genre);
      const isEx = excluded.includes(genre);

      let nextIn = included;
      let nextEx = excluded;

      if (direction === 'exclude') {
        nextIn = included.filter(g => g !== genre);
        nextEx = isEx ? excluded.filter(g => g !== genre) : [...excluded, genre];
      } else if (isIn) {
        nextIn = included.filter(g => g !== genre);
        nextEx = [...excluded, genre];
      } else if (isEx) {
        nextEx = excluded.filter(g => g !== genre);
      } else {
        nextIn = [...included, genre];
      }

      onChange(nextIn, nextEx);
    },
    [included, excluded, onChange]
  );

  const stateOf = (genre: AnimeGenre): GenreState =>
    included.includes(genre) ? 'included' : excluded.includes(genre) ? 'excluded' : 'neutral';

  return { cycle, stateOf };
}
