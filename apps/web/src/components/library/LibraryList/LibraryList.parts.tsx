import { type RowComponentProps } from 'react-window';
import { LibraryListItem } from '@/components/library/LibraryListItem';
import type { IRowProps } from './LibraryList.types';

/**
 * Row adapter for react-window's `List`. Renders the positioned wrapper and
 * delegates to the memoised {@link LibraryListItem}, which gates its own
 * re-renders via narrowed store subscriptions — so the wrapper itself is left
 * unmemoised (react-window hands it a fresh `style` object every render anyway).
 */
export function LibraryRow(props: RowComponentProps<IRowProps>) {
  const { ariaAttributes, index, style, entries, nextAiringMap, onSelect } =
    props as RowComponentProps<IRowProps> & IRowProps;
  const entry = entries[index];
  if (!entry) return null;
  // Spread react-window's `role="listitem"` (+ aria-pos attrs) onto the row root
  // so the `role="list"` container holds a valid `listitem` child rather than the
  // LibraryListItem's button directly (satisfies axe aria-required-children).
  return (
    <div {...ariaAttributes} style={style} className="pb-0.5">
      <LibraryListItem
        entry={entry}
        nextAiring={entry.anilistId ? (nextAiringMap.get(entry.anilistId) ?? null) : null}
        onClick={onSelect}
      />
    </div>
  );
}
