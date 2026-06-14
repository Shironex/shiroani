import type { Editor } from '@tiptap/react';
import type { TFunction } from 'i18next';

export interface IEditorToolbarProps {
  editor: Editor | null;
  /** Optional right-side slot — used in the editor for the mood strip. */
  rightSlot?: React.ReactNode;
}

export interface IEditorToolbarView {
  readonly t: TFunction<'diary'>;
}
