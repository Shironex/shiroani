import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Minus,
  Undo2,
  Redo2,
} from 'lucide-react';

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title?: string;
}

function ToolbarButton({ onClick, isActive, disabled, children, title }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      aria-pressed={isActive}
      className={cn(
        'inline-flex h-7 min-w-7 items-center justify-center rounded-[5px] px-1.5 font-mono text-[11px]',
        'transition-colors',
        isActive
          ? 'bg-primary/15 text-primary'
          : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground',
        disabled && 'opacity-30 pointer-events-none'
      )}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div aria-hidden="true" className="mx-1 h-[18px] w-px bg-border-glass" />;
}

interface EditorToolbarProps {
  editor: Editor | null;
  /** Optional right-side slot — used in the editor for the mood strip. */
  rightSlot?: React.ReactNode;
}

/**
 * Restyled Tiptap toolbar — matches the `.ded-toolbar` band from the redesign
 * mock. Thin horizontal bar, mono-spaced icon buttons with a pressed-state
 * accent highlight. The engine, commands and keyboard shortcuts are
 * unchanged — this component only redresses the surface.
 */
export function EditorToolbar({ editor, rightSlot }: EditorToolbarProps) {
  const { t } = useTranslation('diary');
  if (!editor) return null;

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-0.5 border-b border-border-glass bg-foreground/[0.015]',
        'px-4 py-2'
      )}
    >
      {/* Undo / Redo */}
      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title={t('toolbar.undo')}
      >
        <Undo2 className="w-3.5 h-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title={t('toolbar.redo')}
      >
        <Redo2 className="w-3.5 h-3.5" />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Headings */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive('heading', { level: 1 })}
        title={t('toolbar.heading1')}
      >
        <Heading1 className="w-3.5 h-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive('heading', { level: 2 })}
        title={t('toolbar.heading2')}
      >
        <Heading2 className="w-3.5 h-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive('heading', { level: 3 })}
        title={t('toolbar.heading3')}
      >
        <Heading3 className="w-3.5 h-3.5" />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Inline marks */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        title={t('toolbar.bold')}
      >
        <Bold className="w-3.5 h-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        title={t('toolbar.italic')}
      >
        <Italic className="w-3.5 h-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive('strike')}
        title={t('toolbar.strike')}
      >
        <Strikethrough className="w-3.5 h-3.5" />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Lists & blocks */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
        title={t('toolbar.bulletList')}
      >
        <List className="w-3.5 h-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
        title={t('toolbar.orderedList')}
      >
        <ListOrdered className="w-3.5 h-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive('blockquote')}
        title={t('toolbar.blockquote')}
      >
        <Quote className="w-3.5 h-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        isActive={editor.isActive('codeBlock')}
        title={t('toolbar.codeBlock')}
      >
        <Code className="w-3.5 h-3.5" />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Horizontal rule */}
      <ToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title={t('toolbar.horizontalRule')}
      >
        <Minus className="w-3.5 h-3.5" />
      </ToolbarButton>

      {rightSlot && <div className="ml-auto flex items-center gap-1.5">{rightSlot}</div>}
    </div>
  );
}
