import type { IGenreBreakdownProps, IGenreBreakdownView } from './GenreBreakdown.types';

export function useGenreBreakdown({
  genres,
  limit = 5,
}: IGenreBreakdownProps): IGenreBreakdownView {
  const top = genres.slice(0, limit);
  const max = Math.max(...top.map(g => g.count), 1);
  return { top, max };
}
