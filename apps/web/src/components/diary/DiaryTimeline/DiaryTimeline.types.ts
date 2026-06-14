import type { DiaryEntry } from '@shiroani/shared';

export interface IDiaryTimelineProps {
  entries: DiaryEntry[];
  onSelect: (entry: DiaryEntry) => void;
  onRemove: (entry: DiaryEntry) => void;
  onTogglePin: (entry: DiaryEntry) => void;
  className?: string;
}

export interface IDayGroup {
  readonly key: string;
  readonly header: string;
  readonly entries: DiaryEntry[];
}

export interface IDiaryTimelineView {
  readonly groups: IDayGroup[];
}
