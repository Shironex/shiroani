import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import type { Editor } from '@tiptap/react';
import EditorToolbar from './EditorToolbar';

interface EditorMockOptions {
  canUndo?: boolean;
  canRedo?: boolean;
  /** Marks reported active via isActive(). */
  active?: string[];
}

/** Minimal Tiptap `Editor` stub covering the chain/can/isActive surface. */
function createEditorMock(opts: EditorMockOptions = {}): {
  editor: Editor;
  run: ReturnType<typeof vi.fn>;
} {
  const { canUndo = true, canRedo = true, active = [] } = opts;
  const run = vi.fn();
  const chain = {
    focus: () => chain,
    undo: () => chain,
    redo: () => chain,
    toggleHeading: () => chain,
    toggleBold: () => chain,
    toggleItalic: () => chain,
    toggleStrike: () => chain,
    toggleBulletList: () => chain,
    toggleOrderedList: () => chain,
    toggleBlockquote: () => chain,
    toggleCodeBlock: () => chain,
    setHorizontalRule: () => chain,
    run,
  };
  const editor = {
    chain: () => chain,
    can: () => ({ undo: () => canUndo, redo: () => canRedo }),
    isActive: (name: string) => active.includes(name),
  } as unknown as Editor;
  return { editor, run };
}

describe('EditorToolbar', () => {
  it('renders nothing when no editor is provided', () => {
    const { container } = render(<EditorToolbar editor={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders labelled toolbar buttons when an editor is provided', () => {
    render(<EditorToolbar editor={createEditorMock().editor} />);
    expect(screen.getByRole('button', { name: 'Bold' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Heading 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bullet list' })).toBeInTheDocument();
  });

  it('reflects active marks via aria-pressed', () => {
    render(<EditorToolbar editor={createEditorMock({ active: ['bold'] }).editor} />);
    expect(screen.getByRole('button', { name: 'Bold' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Italic' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('disables undo / redo when the editor cannot perform them', () => {
    render(<EditorToolbar editor={createEditorMock({ canUndo: false, canRedo: false }).editor} />);
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Redo' })).toBeDisabled();
  });

  it('dispatches an editor command when a button is clicked', async () => {
    const { editor, run } = createEditorMock();
    const { user } = render(<EditorToolbar editor={editor} />);
    await user.click(screen.getByRole('button', { name: 'Bold' }));
    expect(run).toHaveBeenCalled();
  });

  it('renders the optional right slot', () => {
    render(<EditorToolbar editor={createEditorMock().editor} rightSlot={<span>mood</span>} />);
    expect(screen.getByText('mood')).toBeInTheDocument();
  });
});
