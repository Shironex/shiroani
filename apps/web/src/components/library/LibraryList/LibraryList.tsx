import { List } from 'react-window';
import { useLibraryList } from './LibraryList.hooks';
import { LibraryRow } from './LibraryList.parts';
import type { ILibraryListProps } from './LibraryList.types';

/**
 * Virtualized list view of the library backed by react-window. Replaces the
 * previous `space-y-0.5` map that mounted every entry at once.
 */
export default function LibraryList(props: ILibraryListProps) {
  const { rowCount, getRowHeight, rowProps } = useLibraryList(props);
  return (
    <List
      rowCount={rowCount}
      rowHeight={getRowHeight}
      overscanCount={8}
      style={{ height: '100%' }}
      rowComponent={LibraryRow}
      rowProps={rowProps}
    />
  );
}
