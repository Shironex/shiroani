import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn, waitFor } from 'storybook/test';
import ThemeEditorDialog from './ThemeEditorDialog';

/**
 * The custom-theme editor: a Radix dialog with a name field, dark/base-theme
 * controls, and grouped color/shadow variable fields. Live-previews edits, and
 * its footer drives Reset / Cancel / Save. The dialog is the story root, so it
 * stays open with no aria-hidden siblings; its `DialogTitle` provides the
 * accessible name.
 */
const meta = {
  title: 'settings/theme-editor/ThemeEditorDialog',
  component: ThemeEditorDialog,
  argTypes: {
    open: { control: 'boolean', description: 'Whether the dialog is mounted/open.' },
    editThemeId: { control: 'text', description: 'Edit an existing custom theme (vs. create).' },
    cloneFromTheme: { control: 'text', description: 'Seed a new theme from this base theme id.' },
    onOpenChange: { description: 'Fires when the dialog requests close (Cancel / Save / Esc).' },
  },
  args: { open: true, onOpenChange: fn() },
  parameters: {
    // Portals to document.body — render its Docs preview in an iframe so the overlay + scroll-lock stay inside the preview block.
    docs: { story: { inline: false, iframeHeight: 720 } },
    a11y: { test: 'error' },
  },
} satisfies Meta<typeof ThemeEditorDialog>;

export default meta;

type Story = StoryObj<typeof ThemeEditorDialog>;

/** New-theme mode — title, name field and variable groups render. */
export const NewTheme: Story = {
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    await expect(body.getByRole('dialog', { name: 'New theme' })).toBeInTheDocument();
    // The first variable group ("Main") renders its color fields.
    await expect(body.getByText('Primary')).toBeInTheDocument();
  },
};

/** Cancel requests a close via onOpenChange. */
export const Cancel: Story = {
  play: async ({ canvasElement, args }) => {
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.click(body.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(args.onOpenChange).toHaveBeenCalledWith(false));
  },
};

/** Saving with the pre-filled name closes the dialog via onOpenChange. */
export const Save: Story = {
  play: async ({ canvasElement, args }) => {
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.click(body.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(args.onOpenChange).toHaveBeenCalledWith(false));
  },
};
