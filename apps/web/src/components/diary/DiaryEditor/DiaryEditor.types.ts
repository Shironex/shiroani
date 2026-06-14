import type { Editor } from '@tiptap/react';
import type { TFunction } from 'i18next';
import type { i18n as I18nInstance } from 'i18next';
import type {
  DiaryEntry,
  DiaryCreatePayload,
  DiaryUpdatePayload,
  DiaryMood,
  DiaryGradient,
} from '@shiroani/shared';

export interface IDiaryEditorProps {
  entry: DiaryEntry | null;
  onClose: () => void;
  /** Resolves `true` when persisted; `false` keeps the editor open (input preserved). */
  onCreate: (payload: DiaryCreatePayload) => Promise<boolean>;
  onUpdate: (payload: DiaryUpdatePayload) => Promise<boolean>;
}

export interface IDiaryEditorView {
  readonly t: TFunction<'diary'>;
  readonly i18n: I18nInstance;
  readonly editor: Editor | null;
  readonly isEditing: boolean;
  readonly title: string;
  readonly setTitle: (value: string) => void;
  readonly coverGradient: DiaryGradient | undefined;
  readonly setCoverGradient: (value: DiaryGradient | undefined) => void;
  readonly mood: DiaryMood | undefined;
  readonly setMood: (value: DiaryMood | undefined) => void;
  readonly isPinned: boolean;
  readonly togglePinned: () => void;
  readonly tagInput: string;
  readonly setTagInput: (value: string) => void;
  readonly tags: string[];
  readonly isSaving: boolean;
  readonly textLength: number;
  readonly isOverLimit: boolean;
  readonly isNearLimit: boolean;
  readonly maxContentLength: number;
  readonly gradientCss: string | undefined;
  readonly handleSave: () => void;
  readonly handleTagAdd: () => void;
  readonly handleTagRemove: (tag: string) => void;
}
