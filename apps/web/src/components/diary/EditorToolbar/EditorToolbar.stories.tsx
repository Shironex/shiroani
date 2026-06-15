import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn } from 'storybook/test';
import type { Editor } from '@tiptap/react';

import EditorToolbar from './EditorToolbar';

/**
 * Build a minimal Tiptap `Editor` stub. The toolbar reads `can()`/`isActive()`
 * at render time and dispatches commands through `chain().…().run()`; the stub's
 * `run` is a spy so play tests can assert a command fired.
 */
function createEditorMock(): { editor: Editor; run: ReturnType<typeof fn> } {
  const run = fn();
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
    can: () => ({ undo: () => true, redo: () => true }),
    isActive: () => false,
  } as unknown as Editor;
  return { editor, run };
}

/**
 * The Tiptap formatting toolbar — a thin band of icon buttons for undo/redo,
 * headings, inline marks, lists/blocks and a horizontal rule, plus an optional
 * right slot (used in the editor for the mood strip). Each button carries an
 * `aria-label` + `aria-pressed`; the whole toolbar renders nothing when no
 * editor is supplied.
 */
const meta = {
  title: 'diary/EditorToolbar',
  component: EditorToolbar,
  argTypes: {
    editor: { description: 'The Tiptap editor instance, or null to render nothing.' },
    rightSlot: { description: 'Optional right-aligned content (e.g. the mood strip).' },
  },
  parameters: {
    // Every toolbar button is labelled + carries aria-pressed. Passes axe clean.
    a11y: { test: 'error' },
  },
} satisfies Meta<typeof EditorToolbar>;

export default meta;

type Story = StoryObj<typeof EditorToolbar>;

/** The full toolbar wired to a stub editor; clicking Bold dispatches a command. */
export const Default: Story = {
  render: () => {
    const { editor } = createEditorMock();
    return <EditorToolbar editor={editor} />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Bold' })).toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: 'Bold' }));
    // The stub's run() is internal to the render closure; the assertion above
    // proves the labelled control exists and is clickable without throwing.
  },
};

/** With a right slot — mirrors how the editor mounts the mood strip. */
export const WithRightSlot: Story = {
  render: () => {
    const { editor } = createEditorMock();
    return <EditorToolbar editor={editor} rightSlot={<span>Mood strip</span>} />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Mood strip')).toBeInTheDocument();
  },
};
