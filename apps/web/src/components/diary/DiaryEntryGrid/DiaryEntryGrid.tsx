import { useDiaryEntryGrid } from './DiaryEntryGrid.hooks';
import { GridView, ListView } from './DiaryEntryGrid.parts';
import type { IDiaryEntryGridProps } from './DiaryEntryGrid.types';

export default function DiaryEntryGrid({
  entries,
  viewMode,
  onSelect,
  onRemove,
  onTogglePin,
}: IDiaryEntryGridProps) {
  const { t } = useDiaryEntryGrid();

  if (viewMode === 'grid') {
    return (
      <GridView
        entries={entries}
        onSelect={onSelect}
        onRemove={onRemove}
        onTogglePin={onTogglePin}
      />
    );
  }

  return <ListView entries={entries} onSelect={onSelect} t={t} />;
}
