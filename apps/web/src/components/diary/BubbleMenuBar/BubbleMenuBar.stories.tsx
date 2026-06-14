import type { Meta, StoryObj } from '@storybook/react-vite';
import type { Editor } from '@tiptap/react';
import BubbleMenuBar from './BubbleMenuBar';

/** Minimal editor stub — the bubble menu only reads `isActive` at render time. */
const chain = {
  focus: () => chain,
  toggleBold: () => chain,
  toggleItalic: () => chain,
  toggleStrike: () => chain,
  toggleHeading: () => chain,
  run: () => {},
};
const editorMock = {
  chain: () => chain,
  isActive: () => false,
} as unknown as Editor;

const meta = {
  title: 'diary/BubbleMenuBar',
  component: BubbleMenuBar,
} satisfies Meta<typeof BubbleMenuBar>;

export default meta;

type Story = StoryObj<typeof BubbleMenuBar>;

export const Default: Story = {
  args: {
    editor: editorMock,
  },
};
