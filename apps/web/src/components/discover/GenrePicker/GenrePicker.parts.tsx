import { useTranslation } from 'react-i18next';
import { Check, Ban } from 'lucide-react';
import { ANIME_GENRES, getAnimeGenreLabel, type AnimeGenre } from '@shiroani/shared';
import { cn } from '@/lib/utils';
import type { GenreState, IGenrePickerView } from './GenrePicker.types';

interface IGenreChipsProps {
  disabled?: boolean;
  stateOf: IGenrePickerView['stateOf'];
  cycle: IGenrePickerView['cycle'];
}

/** The tri-state genre chip grid mapped over the shared `ANIME_GENRES`. */
export function GenreChips({ disabled, stateOf, cycle }: IGenreChipsProps) {
  const { t, i18n } = useTranslation('discover');

  return (
    <div className="flex flex-wrap gap-1.5">
      {ANIME_GENRES.map(genre => {
        const state = stateOf(genre);
        const genreLabel = getAnimeGenreLabel(genre, i18n.language);
        return (
          <GenreChip
            key={genre}
            genre={genre}
            genreLabel={genreLabel}
            state={state}
            disabled={disabled}
            cycle={cycle}
            ariaLabel={t('genres.labelTemplate', {
              genre: genreLabel,
              state:
                state === 'included'
                  ? t('genres.stateIncluded')
                  : state === 'excluded'
                    ? t('genres.stateExcluded')
                    : t('genres.stateNeutral'),
            })}
          />
        );
      })}
    </div>
  );
}

interface IGenreChipProps {
  genre: AnimeGenre;
  genreLabel: string;
  state: GenreState;
  disabled?: boolean;
  ariaLabel: string;
  cycle: IGenrePickerView['cycle'];
}

function GenreChip({ genre, genreLabel, state, disabled, ariaLabel, cycle }: IGenreChipProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => cycle(genre, 'forward')}
      onContextMenu={e => {
        e.preventDefault();
        cycle(genre, 'exclude');
      }}
      aria-pressed={state !== 'neutral'}
      aria-label={ariaLabel}
      className={cn(
        'group inline-flex items-center gap-1 px-2.5 py-[5px] rounded-full',
        'font-mono text-[10px] uppercase tracking-[0.08em] font-semibold',
        'border transition-colors duration-150 select-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]',
        disabled && 'opacity-50 pointer-events-none',
        state === 'neutral' &&
          'bg-foreground/[0.04] border-border-glass text-muted-foreground hover:border-primary/40 hover:text-foreground/80',
        state === 'included' &&
          'bg-primary/15 border-primary/40 text-primary shadow-[0_0_0_1px_oklch(from_var(--primary)_l_c_h/0.2)]',
        state === 'excluded' &&
          'bg-destructive/10 border-destructive/40 text-destructive line-through decoration-destructive/60'
      )}
    >
      {state === 'included' && <Check className="w-3 h-3" />}
      {state === 'excluded' && <Ban className="w-3 h-3" />}
      <span>{genreLabel}</span>
    </button>
  );
}
