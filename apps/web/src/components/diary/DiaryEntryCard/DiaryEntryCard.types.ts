import type { DiaryEntry } from '@shiroani/shared';
import type { LucideIcon } from 'lucide-react';

export interface IDiaryEntryCardProps {
  entry: DiaryEntry;
  onSelect: (entry: DiaryEntry) => void;
  onRemove: (entry: DiaryEntry) => void;
  onTogglePin: (entry: DiaryEntry) => void;
}

export interface IDiaryEntryCardView {
  readonly gradient: string;
  readonly preview: string;
  readonly title: string;
  readonly date: string;
  readonly pinLabel: string;
  readonly removeLabel: string;
  readonly MoodIcon: LucideIcon | null;
  readonly moodColor: string | null;
  readonly tags: string[];
}
