import { useCallback, useState } from 'react';
import type { IRandomFiltersPanelProps, IRandomFiltersPanelView } from './RandomFiltersPanel.types';

export function useRandomFiltersPanel({
  included,
  excluded,
}: Pick<IRandomFiltersPanelProps, 'included' | 'excluded'>): IRandomFiltersPanelView {
  const [open, setOpen] = useState(true);
  const toggleOpen = useCallback(() => setOpen(o => !o), []);

  const hasIncluded = included.length > 0;
  const hasExcluded = excluded.length > 0;
  const hasFilters = hasIncluded || hasExcluded;
  const showSeparator = hasIncluded && hasExcluded;

  return { open, toggleOpen, hasFilters, hasIncluded, hasExcluded, showSeparator };
}
