import type { Editor } from '@tiptap/react';
import type { LucideIcon } from 'lucide-react';

export interface IBubbleMenuBarProps {
  editor: Editor;
}

export interface IBubbleButton {
  readonly key: string;
  readonly Icon: LucideIcon;
  readonly label: string;
  readonly active: boolean;
  readonly toggle: () => void;
}

export interface IBubbleMenuBarView {
  readonly formattingButtons: IBubbleButton[];
  readonly headingButton: IBubbleButton;
}
