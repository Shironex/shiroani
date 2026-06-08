import { useCallback } from 'react';
import { List, type RowComponentProps } from 'react-window';
import { LibraryListItem } from '@/components/library/LibraryListItem';
import type { AnimeEntry } from '@shiroani/shared';

type NextAiring = { airingAt: number; episode: number };

// LibraryListItem: thumbnail `h-14` (56px) is the tallest cell, plus `py-2.5`
// (20px) and the 1px borders (2px) → 78px content. The inner `pb-0.5` wrapper
// re-creates the old `space-y-0.5` (2px) gap, for an 80px row slot.
const ROW_HEIGHT_PX = 80;
// Trailing empty row so the last item clears the floating navigation dock at the
// end of the scroll (mirrors the old `pb-24`), without leaving a permanent gap.
const DOCK_CLEARANCE_PX = 96;

interface RowProps {
  entries: AnimeEntry[];
  nextAiringMap: Map<number, NextAiring>;
  onSelect: (entry: AnimeEntry) => void;
}

/**
 * Row adapter for react-window's `List`. Renders the positioned wrapper and
 * delegates to the memoised {@link LibraryListItem}, which gates its own
 * re-renders via narrowed store subscriptions — so the wrapper itself is left
 * unmemoised (react-window hands it a fresh `style` object every render anyway).
 */
function LibraryRow(props: RowComponentProps<RowProps>) {
  const { index, style, entries, nextAiringMap, onSelect } = props as RowComponentProps<RowProps> &
    RowProps;
  const entry = entries[index];
  if (!entry) return null;
  return (
    <div style={style} className="pb-0.5">
      <LibraryListItem
        entry={entry}
        nextAiring={entry.anilistId ? (nextAiringMap.get(entry.anilistId) ?? null) : null}
        onClick={onSelect}
      />
    </div>
  );
}

interface LibraryListProps {
  entries: AnimeEntry[];
  nextAiringMap: Map<number, NextAiring>;
  onSelect: (entry: AnimeEntry) => void;
}

/**
 * Virtualized list view of the library backed by react-window. Replaces the
 * previous `space-y-0.5` map that mounted every entry at once.
 */
export function LibraryList({ entries, nextAiringMap, onSelect }: LibraryListProps) {
  // One extra row of dock-clearance height appended after the entries.
  const getRowHeight = useCallback(
    (index: number) => (index >= entries.length ? DOCK_CLEARANCE_PX : ROW_HEIGHT_PX),
    [entries.length]
  );
  return (
    <List
      rowCount={entries.length + 1}
      rowHeight={getRowHeight}
      overscanCount={8}
      className="scrollbar-thin"
      style={{ height: '100%' }}
      rowComponent={LibraryRow}
      rowProps={{ entries, nextAiringMap, onSelect }}
    />
  );
}
