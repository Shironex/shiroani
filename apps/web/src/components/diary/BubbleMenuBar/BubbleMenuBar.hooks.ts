import type { Editor } from '@tiptap/react';
import { Bold, Italic, Strikethrough, Heading2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { IBubbleButton, IBubbleMenuBarView } from './BubbleMenuBar.types';

const FORMATTING_BUTTONS = [
  {
    key: 'bold',
    Icon: Bold,
    labelKey: 'toolbar.bold',
    toggle: (e: Editor) => e.chain().focus().toggleBold().run(),
    isActive: (e: Editor) => e.isActive('bold'),
  },
  {
    key: 'italic',
    Icon: Italic,
    labelKey: 'toolbar.italic',
    toggle: (e: Editor) => e.chain().focus().toggleItalic().run(),
    isActive: (e: Editor) => e.isActive('italic'),
  },
  {
    key: 'strike',
    Icon: Strikethrough,
    labelKey: 'toolbar.strike',
    toggle: (e: Editor) => e.chain().focus().toggleStrike().run(),
    isActive: (e: Editor) => e.isActive('strike'),
  },
] as const;

const HEADING_BUTTON = {
  key: 'heading',
  Icon: Heading2,
  labelKey: 'toolbar.heading2',
  toggle: (e: Editor) => e.chain().focus().toggleHeading({ level: 2 }).run(),
  isActive: (e: Editor) => e.isActive('heading', { level: 2 }),
} as const;

export function useBubbleMenuBar(editor: Editor): IBubbleMenuBarView {
  const { t } = useTranslation('diary');

  const formattingButtons: IBubbleButton[] = FORMATTING_BUTTONS.map(
    ({ key, Icon, labelKey, toggle, isActive }) => ({
      key,
      Icon,
      label: t(labelKey),
      active: isActive(editor),
      toggle: () => toggle(editor),
    })
  );

  const headingButton: IBubbleButton = {
    key: HEADING_BUTTON.key,
    Icon: HEADING_BUTTON.Icon,
    label: t(HEADING_BUTTON.labelKey),
    active: HEADING_BUTTON.isActive(editor),
    toggle: () => HEADING_BUTTON.toggle(editor),
  };

  return { formattingButtons, headingButton };
}
