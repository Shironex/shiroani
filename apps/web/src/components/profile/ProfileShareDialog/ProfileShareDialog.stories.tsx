import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, expect, fn, waitFor } from 'storybook/test';
import { mockUserProfile } from '../profile-fixtures';
import ProfileShareDialog from './ProfileShareDialog';

/**
 * Share-profile dialog — renders the profile share card on a real `<canvas>`
 * when opened, with Copy-to-clipboard and Save-as-PNG actions. The card render
 * is canvas-only (no socket); in a real browser the preview image resolves, in
 * jsdom the effect early-returns while closed.
 */
const meta = {
  title: 'profile/ProfileShareDialog',
  component: ProfileShareDialog,
  parameters: {
    layout: 'fullscreen',
    a11y: { test: 'error' },
  },
  args: {
    open: true,
    onOpenChange: fn(),
    profile: mockUserProfile,
  },
  argTypes: {
    open: { control: 'boolean', description: 'Controls dialog visibility.' },
    onOpenChange: { description: 'Fired when Radix requests open/close (overlay click, Esc).' },
    profile: { description: 'AniList profile rendered into the share card.' },
  },
} satisfies Meta<typeof ProfileShareDialog>;

export default meta;

type Story = StoryObj<typeof ProfileShareDialog>;

/** Open — the dialog portals its title, preview and the two export actions. */
export const Open: Story = {
  play: async ({ canvasElement }) => {
    // Radix Dialog content portals to document.body.
    const body = within(canvasElement.ownerDocument.body);
    await expect(await body.findByRole('dialog')).toBeInTheDocument();
    await expect(body.getByText('Share profile')).toBeInTheDocument();
    await expect(body.getByRole('button', { name: /copy to clipboard/i })).toBeInTheDocument();
    await expect(body.getByRole('button', { name: /save as png/i })).toBeInTheDocument();
    // The card render settles to a preview image (real canvas in the browser).
    await waitFor(() =>
      expect(body.getByRole('img', { name: 'Profile card preview' })).toBeInTheDocument()
    );
  },
};

/** Closed — nothing is portalled; the dialog and its preview are absent. */
export const Closed: Story = {
  args: { open: false },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    await expect(body.queryByRole('dialog')).not.toBeInTheDocument();
  },
};
