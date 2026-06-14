import type { Meta, StoryObj } from '@storybook/react-vite';
import type { Editor } from '@tiptap/react';
import EditorToolbar from './EditorToolbar';

/** Minimal editor stub — the toolbar reads `can`/`isActive` at render time. */
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
const editorMock = {
  chain: () => chain,
  can: () => ({ undo: () => true, redo: () => true }),
  isActive: () => false,
} as unknown as Editor;

const meta = {
  title: 'diary/EditorToolbar',
  component: EditorToolbar,
} satisfies Meta<typeof EditorToolbar>;

export default meta;

type Story = StoryObj<typeof EditorToolbar>;

export const Default: Story = {
  args: {
    editor: editorMock,
  },
};
