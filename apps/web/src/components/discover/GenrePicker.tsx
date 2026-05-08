import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Ban } from 'lucide-react';
import { ANIME_GENRES, getAnimeGenreLabel, type AnimeGenre } from '@shiroani/shared';
import { cn } from '@/lib/utils';

type GenreState = 'neutral' | 'included' | 'excluded';

interface GenrePickerProps {
  included: string[];
  excluded: string[];
  onChange: (included: string[], excluded: string[]) => void;
  disabled?: boolean;
}

/**
 * Tri-state chip picker. Click cycles a genre through:
 *   neutral → included → excluded → neutral
 * Right-click jumps straight to excluded for power users.
 */
const GenrePicker = memo(function GenrePicker({
  included,
  excluded,
  onChange,
  disabled,
}: GenrePickerProps) {
  const { t, i18n } = useTranslation('discover');
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

  return (
    <div className="flex flex-wrap gap-1.5">
      {ANIME_GENRES.map(genre => {
        const state = stateOf(genre);
        const genreLabel = getAnimeGenreLabel(genre, i18n.language);
        return (
          <button
            key={genre}
            type="button"
            disabled={disabled}
            onClick={() => cycle(genre, 'forward')}
            onContextMenu={e => {
              e.preventDefault();
              cycle(genre, 'exclude');
            }}
            aria-pressed={state !== 'neutral'}
            aria-label={t('genres.labelTemplate', {
              genre: genreLabel,
              state:
                state === 'included'
                  ? t('genres.stateIncluded')
                  : state === 'excluded'
                    ? t('genres.stateExcluded')
                    : t('genres.stateNeutral'),
            })}
            className={cn(
              'group inline-flex items-center gap-1 px-2.5 py-[5px] rounded-full',
              'font-mono text-[10px] uppercase tracking-[0.08em] font-semibold',
              'border transition-all duration-150 select-none',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              disabled && 'opacity-50 pointer-events-none',
              state === 'neutral' &&
                'bg-foreground/[0.04] border-border-glass text-muted-foreground hover:border-primary/40 hover:text-foreground/80',
              state === 'included' &&
                'bg-primary/15 border-primary/40 text-primary shadow-[0_0_0_1px_hsl(var(--primary)/0.2)]',
              state === 'excluded' &&
                'bg-destructive/10 border-destructive/40 text-destructive line-through decoration-destructive/60'
            )}
          >
            {state === 'included' && <Check className="w-3 h-3" />}
            {state === 'excluded' && <Ban className="w-3 h-3" />}
            <span>{genreLabel}</span>
          </button>
        );
      })}
    </div>
  );
});

export { GenrePicker };
