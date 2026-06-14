import { memo } from 'react';
import { useGenrePicker } from './GenrePicker.hooks';
import { GenreChips } from './GenrePicker.parts';
import type { IGenrePickerProps } from './GenrePicker.types';

/**
 * Tri-state chip picker. Click cycles a genre through:
 *   neutral → included → excluded → neutral
 * Right-click jumps straight to excluded for power users.
 */
function GenrePicker({ included, excluded, onChange, disabled }: IGenrePickerProps) {
  const { cycle, stateOf } = useGenrePicker({ included, excluded, onChange });

  return <GenreChips disabled={disabled} stateOf={stateOf} cycle={cycle} />;
}

export default memo(GenrePicker);
