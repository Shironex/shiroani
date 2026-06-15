import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import type { Editor } from '@tiptap/react';
import BubbleMenuBar from './BubbleMenuBar';

/**
 * Minimal Tiptap `Editor` stub — just the chain/isActive surface the bubble
 * menu touches. `active` controls which marks report as active.
 */
function createEditorMock(active: string[] = []): {
  editor: Editor;
  run: ReturnType<typeof vi.fn>;
} {
  const run = vi.fn();
  const chain = {
    focus: () => chain,
    toggleBold: () => chain,
    toggleItalic: () => chain,
    toggleStrike: () => chain,
    toggleHeading: () => chain,
    run,
  };
  const editor = {
    chain: () => chain,
    isActive: (name: string) => active.includes(name),
  } as unknown as Editor;
  return { editor, run };
}

describe('BubbleMenuBar', () => {
  it('renders the labelled formatting controls', () => {
    render(<BubbleMenuBar editor={createEditorMock().editor} />);
    expect(screen.getByRole('button', { name: 'Bold' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Italic' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Strikethrough' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Heading 2' })).toBeInTheDocument();
  });

  it('renders exactly four controls (three inline marks + heading)', () => {
    render(<BubbleMenuBar editor={createEditorMock().editor} />);
    expect(screen.getAllByRole('button')).toHaveLength(4);
  });

  it('reflects an active mark via aria-pressed', () => {
    render(<BubbleMenuBar editor={createEditorMock(['bold']).editor} />);
    expect(screen.getByRole('button', { name: 'Bold' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Italic' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('runs an editor command when a formatting button is clicked', async () => {
    const { editor, run } = createEditorMock();
    const { user } = render(<BubbleMenuBar editor={editor} />);
    await user.click(screen.getByRole('button', { name: 'Bold' }));
    expect(run).toHaveBeenCalled();
  });
});
