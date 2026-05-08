import type { Editor } from '@tiptap/react';
import { Bold, Italic, Strikethrough, Heading2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface BubbleMenuBarProps {
  editor: Editor;
}

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

/**
 * Tiptap bubble menu surface — floats next to selected text. Restyled to
 * match the redesign's panel vocabulary: card background, soft 1-px border,
 * mono-spaced icon cluster with accent highlight for active marks.
 */
export function BubbleMenuBar({ editor }: BubbleMenuBarProps) {
  const { t } = useTranslation('diary');
  return (
    <div
      className={cn(
        'flex items-center gap-0.5 rounded-[10px] border border-border-glass bg-popover/95',
        'p-1 shadow-[0_10px_28px_oklch(0_0_0/0.35)] backdrop-blur-sm'
      )}
    >
      {FORMATTING_BUTTONS.map(({ key, Icon, labelKey, toggle, isActive }) => (
        <button
          key={key}
          type="button"
          aria-label={t(labelKey)}
          aria-pressed={isActive(editor)}
          onClick={() => toggle(editor)}
          className={cn(
            'inline-flex h-7 w-7 items-center justify-center rounded-[6px] transition-colors',
            isActive(editor)
              ? 'bg-primary/15 text-primary'
              : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground'
          )}
        >
          <Icon className="w-3.5 h-3.5" />
        </button>
      ))}
      <div aria-hidden="true" className="mx-0.5 h-[18px] w-px bg-border-glass" />
      <button
        type="button"
        aria-label={t(HEADING_BUTTON.labelKey)}
        aria-pressed={HEADING_BUTTON.isActive(editor)}
        onClick={() => HEADING_BUTTON.toggle(editor)}
        className={cn(
          'inline-flex h-7 w-7 items-center justify-center rounded-[6px] transition-colors',
          HEADING_BUTTON.isActive(editor)
            ? 'bg-primary/15 text-primary'
            : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground'
        )}
      >
        <HEADING_BUTTON.Icon className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
