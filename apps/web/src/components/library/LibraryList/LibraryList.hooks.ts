import { useCallback } from 'react';
import type { ILibraryListProps, ILibraryListView } from './LibraryList.types';

// LibraryListItem: thumbnail `h-14` (56px) is the tallest cell, plus `py-2.5`
// (20px) and the 1px borders (2px) → 78px content. The inner `pb-0.5` wrapper
// re-creates the old `space-y-0.5` (2px) gap, for an 80px row slot.
const ROW_HEIGHT_PX = 80;
// Trailing empty row so the last item clears the floating navigation dock at the
// end of the scroll (mirrors the old `pb-24`), without leaving a permanent gap.
const DOCK_CLEARANCE_PX = 96;

export function useLibraryList({
  entries,
  nextAiringMap,
  onSelect,
}: ILibraryListProps): ILibraryListView {
  // One extra row of dock-clearance height appended after the entries.
  const getRowHeight = useCallback(
    (index: number) => (index >= entries.length ? DOCK_CLEARANCE_PX : ROW_HEIGHT_PX),
    [entries.length]
  );

  return {
    rowCount: entries.length + 1,
    getRowHeight,
    rowProps: { entries, nextAiringMap, onSelect },
  };
}
