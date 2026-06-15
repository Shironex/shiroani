import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect } from 'storybook/test';
import type { Editor } from '@tiptap/react';
import BubbleMenuBar from './BubbleMenuBar';

/** Minimal editor stub — the bubble menu reads `isActive` and dispatches via chain. */
function createEditorMock(): Editor {
  const chain = {
    focus: () => chain,
    toggleBold: () => chain,
    toggleItalic: () => chain,
    toggleStrike: () => chain,
    toggleHeading: () => chain,
    run: () => {},
  };
  return {
    chain: () => chain,
    isActive: () => false,
  } as unknown as Editor;
}

/**
 * The Tiptap bubble-menu surface that floats next to selected text — a compact
 * panel with the inline-mark cluster (bold / italic / strikethrough) and a
 * heading toggle. Each control is a labelled toggle button (`aria-pressed`).
 */
const meta = {
  title: 'diary/BubbleMenuBar',
  component: BubbleMenuBar,
  argTypes: {
    editor: { description: 'The Tiptap editor instance the menu acts on.' },
  },
  parameters: {
    // Each formatting control is a labelled toggle button. Passes axe clean.
    a11y: { test: 'error' },
  },
} satisfies Meta<typeof BubbleMenuBar>;

export default meta;

type Story = StoryObj<typeof BubbleMenuBar>;

/** The four formatting controls; clicking one runs its editor command. */
export const Default: Story = {
  render: () => <BubbleMenuBar editor={createEditorMock()} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Bold' })).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: 'Heading 2' })).toBeInTheDocument();
    // The button is clickable without throwing (the stub swallows the command).
    await userEvent.click(canvas.getByRole('button', { name: 'Italic' }));
  },
};
