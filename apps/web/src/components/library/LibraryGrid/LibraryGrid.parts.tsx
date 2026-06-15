import { type CellComponentProps } from 'react-window';
import { AnimeCard } from '@/components/library/AnimeCard';
import type { ICellProps } from './LibraryGrid.types';

/**
 * react-window cell adapter: maps the (row, column) coordinate to an entry and
 * renders an {@link AnimeCard} with a symmetric half-gap inset on every edge so
 * card widths and heights stay uniform across each row.
 */
export function GridCell({
  ariaAttributes,
  columnIndex,
  rowIndex,
  style,
  entries,
  columnCount,
  gap,
  nextAiringMap,
  onSelect,
  onContinue,
  onRemove,
}: CellComponentProps<ICellProps>) {
  const index = rowIndex * columnCount + columnIndex;
  const entry = entries[index];
  const halfGap = gap / 2;
  // Symmetric half-gap inset on every edge → uniform card width and height
  // across the row (no edge/middle raggedness), with a `gap`-sized space between
  // neighbours. Outermost cards gain a 7px inset from the container edge, which
  // is imperceptible against the surrounding `px-7`.
  const insetStyle: React.CSSProperties = {
    ...style,
    paddingLeft: halfGap,
    paddingRight: halfGap,
    paddingTop: halfGap,
    paddingBottom: halfGap,
  };
  // Spread react-window's `role="gridcell"` (+ aria-colindex) onto the cell root
  // so the `role="row"` wrapper contains a valid `gridcell` child rather than the
  // AnimeCard's button/heading directly (satisfies axe aria-required-children).
  // Empty cells (row overflow + the trailing dock-clearance row) stay bare
  // `gridcell`s — keeping the role (not `aria-hidden`) means every `role="row"`
  // has at least one required gridcell child, which axe requires.
  if (!entry) {
    return <div {...ariaAttributes} style={insetStyle} />;
  }
  return (
    <div {...ariaAttributes} style={insetStyle}>
      <AnimeCard
        entry={entry}
        nextAiring={entry.anilistId ? (nextAiringMap.get(entry.anilistId) ?? null) : null}
        onSelect={onSelect}
        onContinue={onContinue}
        onRemove={onRemove}
      />
    </div>
  );
}
