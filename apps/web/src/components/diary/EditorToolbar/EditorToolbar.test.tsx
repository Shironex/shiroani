import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import type { Editor } from '@tiptap/react';
import EditorToolbar from './EditorToolbar';

/** Minimal Tiptap `Editor` stub covering the chain/can/isActive surface. */
function createEditorMock(): Editor {
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
    run: () => {},
  };
  return {
    chain: () => chain,
    can: () => ({ undo: () => true, redo: () => true }),
    isActive: () => false,
  } as unknown as Editor;
}

describe('EditorToolbar', () => {
  it('renders nothing when no editor is provided', () => {
    const { container } = render(<EditorToolbar editor={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the toolbar buttons when an editor is provided', () => {
    render(<EditorToolbar editor={createEditorMock()} />);
    expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
  });

  it('renders the optional right slot', () => {
    render(<EditorToolbar editor={createEditorMock()} rightSlot={<span>mood</span>} />);
    expect(screen.getByText('mood')).toBeInTheDocument();
  });
});
