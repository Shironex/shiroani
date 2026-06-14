import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import type { Editor } from '@tiptap/react';
import BubbleMenuBar from './BubbleMenuBar';

/**
 * Minimal Tiptap `Editor` stub — just the chain/isActive surface the bubble
 * menu touches. Rendering the real editor isn't needed for a smoke test.
 */
function createEditorMock(): { editor: Editor; run: ReturnType<typeof vi.fn> } {
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
    isActive: () => false,
  } as unknown as Editor;
  return { editor, run };
}

describe('BubbleMenuBar', () => {
  it('renders the formatting buttons (bold / italic / strike + heading)', () => {
    const { editor } = createEditorMock();
    render(<BubbleMenuBar editor={editor} />);
    // 3 inline-mark buttons + 1 heading button.
    expect(screen.getAllByRole('button')).toHaveLength(4);
  });

  it('runs an editor command when a button is clicked', async () => {
    const { editor, run } = createEditorMock();
    const { user } = render(<BubbleMenuBar editor={editor} />);
    await user.click(screen.getAllByRole('button')[0]!);
    expect(run).toHaveBeenCalled();
  });
});
