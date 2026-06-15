import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn } from 'storybook/test';
import type { AnimeEntry } from '@shiroani/shared';
import AnimeDetailModal from './AnimeDetailModal';

const entry: AnimeEntry = {
  id: 1,
  title: 'Steins;Gate',
  status: 'watching',
  currentEpisode: 5,
  episodes: 24,
  score: 9,
  coverImage: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/9253.jpg',
  notes: 'A masterpiece of time travel.',
  addedAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-06-01T00:00:00Z',
};

/**
 * Radix Dialog editor for a single library entry — poster + stat column on the
 * left, an editable form (status, progress, score, notes, resume link, AniList
 * id) plus a save/open/delete action bar on the right. Returns null when no
 * entry is passed; deleting opens a confirm dialog. Content is portalled to
 * `document.body`, so interaction tests query the body, not the canvas.
 */
const meta = {
  title: 'library/AnimeDetailModal',
  component: AnimeDetailModal,
  parameters: {
    layout: 'fullscreen',
    // TODO(a11y): the embedded SliderInputField fields render Radix slider thumbs
    // (role="slider") with no accessible name — axe flags `aria-input-field-name`.
    // The fix lives in the shared `components/ui/slider.tsx` thumb (out of scope
    // here); ratchet to 'error' once it forwards a thumb aria-label.
    a11y: { test: 'todo' },
  },
  args: { open: true, onOpenChange: fn() },
  argTypes: {
    entry: { description: 'The library entry to display/edit; the dialog renders null when null.' },
    open: { description: 'Whether the dialog is visible.' },
    onOpenChange: { description: 'Fired with the next open state (false on save/delete/close).' },
  },
} satisfies Meta<typeof AnimeDetailModal>;

export default meta;

type Story = StoryObj<typeof AnimeDetailModal>;

// Entry without an anilistId so the self-fetching relations/extras sections stay
// gated off — keeps the story socket-free.
export const Default: Story = {
  args: { entry },
  play: async ({ canvasElement, args }) => {
    // Dialog content is portalled to document.body.
    const body = within(canvasElement.ownerDocument.body);
    const notes = await body.findByLabelText('Notes');
    await userEvent.type(notes, ' Edited in play.');
    await userEvent.click(await body.findByRole('button', { name: 'Save' }));
    // Saving closes the dialog.
    await expect(args.onOpenChange).toHaveBeenCalledWith(false);
  },
};

/** Clicking Delete opens the "Remove from library" confirm dialog. */
export const DeleteConfirm: Story = {
  args: { entry },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.click(await body.findByRole('button', { name: 'Delete' }));
    await expect(await body.findByText('Remove from library')).toBeInTheDocument();
  },
};

/** Opening the status Select and picking an option reflects it on the trigger. */
export const ChangeStatus: Story = {
  args: { entry },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    const trigger = await body.findByRole('combobox', { name: 'Status' });
    await userEvent.click(trigger);
    // Radix Select content portals to document.body.
    const option = await body.findByRole('option', { name: /Completed/i });
    await userEvent.click(option);
    await expect(trigger).toHaveTextContent('Completed');
  },
};
