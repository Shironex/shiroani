import { useTranslation } from 'react-i18next';
import type { UserProfile } from '@shiroani/shared';

interface GenreBreakdownProps {
  genres: UserProfile['statistics']['genres'];
  limit?: number;
}

/**
 * Ordered horizontal-bar breakdown of the top N watched genres.
 *
 * Mirrors the `.genre-bar` stack on the Profile mock: each row shows the
 * genre name + percentage, with a 5px pill-shaped bar underneath. Colours
 * cycle through a small palette keyed to the genre index (matching the
 * mock's hand-picked hues).
 */
export function GenreBreakdown({ genres, limit = 5 }: GenreBreakdownProps) {
  const { t } = useTranslation('profile');
  const top = genres.slice(0, limit);
  const max = Math.max(...top.map(g => g.count), 1);

  if (top.length === 0) {
    return <p className="text-[12px] text-muted-foreground/70">{t('genres.empty')}</p>;
  }

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

const GENRE_COLOURS = [
  'oklch(0.74 0.15 355)',
  'oklch(0.7 0.15 280)',
  'oklch(0.7 0.15 30)',
  'oklch(0.78 0.15 140)',
  'oklch(0.74 0.15 355)',
];
