import type { AnimeGenre } from '@shiroani/shared';

export type GenreState = 'neutral' | 'included' | 'excluded';

export interface IGenrePickerProps {
  included: string[];
  excluded: string[];
  onChange: (included: string[], excluded: string[]) => void;
  disabled?: boolean;
}

export interface IGenrePickerView {
  readonly cycle: (genre: AnimeGenre, direction: 'forward' | 'exclude') => void;
  readonly stateOf: (genre: AnimeGenre) => GenreState;
}
