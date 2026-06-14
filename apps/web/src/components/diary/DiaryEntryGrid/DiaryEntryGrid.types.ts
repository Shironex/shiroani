import type { TFunction } from 'i18next';
import type { DiaryEntry } from '@shiroani/shared';

export interface IDiaryEntryGridProps {
  entries: DiaryEntry[];
  viewMode: 'grid' | 'list';
  onSelect: (entry: DiaryEntry) => void;
  onRemove: (entry: DiaryEntry) => void;
  onTogglePin: (entry: DiaryEntry) => void;
}

export interface IDiaryEntryGridView {
  readonly t: TFunction<'diary'>;
}
