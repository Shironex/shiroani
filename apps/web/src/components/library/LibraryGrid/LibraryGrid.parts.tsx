import { type CellComponentProps } from 'react-window';
import { AnimeCard } from '@/components/library/AnimeCard';
import type { ICellProps } from './LibraryGrid.types';

/**
 * react-window cell adapter: maps the (row, column) coordinate to an entry and
 * renders an {@link AnimeCard} with a symmetric half-gap inset on every edge so
 * card widths and heights stay uniform across each row.
 */
export function GridCell({
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
  if (!entry) {
    return <div style={insetStyle} aria-hidden="true" />;
  }
  return (
    <div style={insetStyle}>
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
