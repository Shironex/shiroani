import { CountBars, type ICountBarRow } from '../shared-parts';
import type { IGenreBreakdownView } from './GenreBreakdown.types';

/** Ordered horizontal-bar stack — one row per top genre with a percentage bar. */
export function GenreBars({ top, max }: IGenreBreakdownView) {
  const rows: ICountBarRow[] = top.map(g => {
    const pct = Math.round((g.count / max) * 100);
    return { key: g.name, label: g.name, valueLabel: `${pct}%`, pct };
  });

  return <CountBars rows={rows} />;
}
