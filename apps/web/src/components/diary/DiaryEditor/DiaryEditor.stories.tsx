import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn, waitFor } from 'storybook/test';
import type { DiaryEntry } from '@shiroani/shared';
import { withFullHeight } from '../../../../.storybook/decorators';
import DiaryEditor from './DiaryEditor';

const entry: DiaryEntry = {
  id: 1,
  title: 'Refleksja po odcinku',
  contentJson: JSON.stringify({
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Pierwsze wrażenia.' }] }],
  }),
  createdAt: '2025-06-15',
  updatedAt: '2025-06-15',
  isPinned: false,
  coverGradient: 'sakura',
  mood: 'great',
  tags: ['anime'],
};

/**
 * Inline diary editor — takes over the whole Diary view body when active (not a
 * modal). Left rail: cover/gradient picker, linked-anime summary, mood pills,
 * tag input and the pin toggle. Main column: a back button, an editable title,
 * the Tiptap toolbar, the editor body (with a selection bubble menu) and a
 * footer with the live character counter. Save awaits the persist outcome and
 * only closes on success, so a failed save keeps the user's content on screen.
 */
const meta = {
  title: 'diary/DiaryEditor',
  component: DiaryEditor,
  parameters: {
    layout: 'fullscreen',
    // Title input, tag controls and pin toggle carry accessible names; the cover
    // image is decorative (alt=""). Every interactive-a11y rule is enforced.
    //
    // `color-contrast` is the lone disabled rule: the Tiptap prose body uses the
    // correct `--foreground` theme token and the editor body carries the app's
    // dark `bg-background` surface, but Storybook's canvas paints white behind
    // the floating ProseMirror content, so axe measures near-white text on
    // white. This is a theme-token/canvas artifact, not an app contrast bug.
    // TODO(a11y): color-contrast disabled — Storybook canvas paints white behind
    // the themed prose surface; the token contrast is correct in-app.
    a11y: {
      test: 'error',
      config: { rules: [{ id: 'color-contrast', enabled: false }] },
    },
  },
  decorators: [withFullHeight],
  args: {
    onClose: fn(),
    onCreate: fn(async () => true),
    onUpdate: fn(async () => true),
  },
  argTypes: {
    entry: { description: 'The entry being edited, or null for a new entry.' },
    onClose: { description: 'Closes the editor (back / cancel / Esc).' },
    onCreate: { description: 'Persists a new entry; resolves true on success.' },
    onUpdate: { description: 'Persists edits to an existing entry; resolves true on success.' },
  },
} satisfies Meta<typeof DiaryEditor>;

export default meta;

type Story = StoryObj<typeof DiaryEditor>;

/** New entry — empty form; typing a title and saving calls onCreate, then closes. */
export const New: Story = {
  args: { entry: null },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('region', { name: 'New diary entry' })).toBeInTheDocument();

    await userEvent.type(canvas.getByLabelText('Entry title'), 'Nowy wpis');
    await userEvent.click(canvas.getByRole('button', { name: 'Add entry' }));

    await waitFor(() => expect(args.onCreate).toHaveBeenCalled());
    await waitFor(() => expect(args.onClose).toHaveBeenCalled());
  },
};

/** Editing — seeded from an existing entry; the title input carries its value. */
export const Editing: Story = {
  args: { entry },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('region', { name: 'Diary entry editor' })).toBeInTheDocument();
    await expect(canvas.getByLabelText('Entry title')).toHaveValue('Refleksja po odcinku');
  },
};
