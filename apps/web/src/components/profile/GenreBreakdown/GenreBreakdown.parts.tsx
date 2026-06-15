import type { IGenreBreakdownView } from './GenreBreakdown.types';

const GENRE_COLOURS = [
  'oklch(0.74 0.15 355)',
  'oklch(0.7 0.15 280)',
  'oklch(0.7 0.15 30)',
  'oklch(0.78 0.15 140)',
  'oklch(0.74 0.15 355)',
];

/** Ordered horizontal-bar stack — one row per top genre with a percentage bar. */
export function GenreBars({ top, max }: IGenreBreakdownView) {
  return (
    <div className="flex flex-col gap-2">
      {top.map((g, i) => {
        const pct = Math.round((g.count / max) * 100);
        const color = GENRE_COLOURS[i % GENRE_COLOURS.length];
        return (
          <div key={g.name}>
            <div className="flex justify-between items-baseline mb-1">
              <span className="text-[11.5px] font-medium text-foreground/90 truncate">
                {g.name}
              </span>
              <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
                {pct}%
              </span>
            </div>
            <div className="h-[5px] rounded-[3px] bg-foreground/7 overflow-hidden">
              <div
                className="h-full rounded-[3px] transition-[width] duration-700 ease-out"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
