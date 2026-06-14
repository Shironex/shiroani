import { cn } from '@/lib/utils';
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
import { useEditorToolbar } from './EditorToolbar.hooks';
import { ToolbarButton, ToolbarDivider } from './EditorToolbar.parts';
import type { IEditorToolbarProps } from './EditorToolbar.types';

/**
 * Restyled Tiptap toolbar — matches the `.ded-toolbar` band from the redesign
 * mock. Thin horizontal bar, mono-spaced icon buttons with a pressed-state
 * accent highlight. The engine, commands and keyboard shortcuts are
 * unchanged — this component only redresses the surface.
 */
export default function EditorToolbar({ editor, rightSlot }: IEditorToolbarProps) {
  const { t } = useEditorToolbar();
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
