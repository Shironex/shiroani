import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn, waitFor } from 'storybook/test';
import { PushLibraryButton } from './';
import SyncModeSelector from './SyncDirectionControls';

/**
 * Direction-mode controls for a provider's sync card.
 *
 * `SyncModeSelector` is an accessible radiogroup picking two-way / push-only /
 * pull-only; it reflects `value` and fires `onChange` with the picked mode.
 * `PushLibraryButton` opens an AlertDialog to choose create-missing vs overwrite
 * before calling `onPush`. Both read their labels from the provider's i18n keys.
 */
const meta = {
  title: 'settings/SyncDirectionControls',
  component: SyncModeSelector,
  parameters: {
    // The radiogroup is labelled and each radio is a named button — axe clean.
    a11y: { test: 'error' },
  },
  argTypes: {
    provider: {
      control: 'inline-radio',
      options: ['anilist', 'mal'],
      description: 'Which provider backs the option labels (anilist.* / mal.* keys).',
    },
    value: {
      control: 'inline-radio',
      options: ['two-way', 'push', 'pull'],
      description: 'The currently selected sync direction.',
    },
    onChange: { description: 'Fires with the picked direction when a radio is chosen.' },
    disabled: { control: 'boolean', description: 'Disables every radio (e.g. while syncing).' },
  },
  args: { provider: 'anilist', value: 'two-way', onChange: fn() },
} satisfies Meta<typeof SyncModeSelector>;

export default meta;

type Story = StoryObj<typeof SyncModeSelector>;

/** Two-way is the active mode; its hint renders underneath. */
export const ModeSelector: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const group = canvas.getByRole('radiogroup', { name: 'Sync direction' });
    await expect(group).toBeInTheDocument();
    await expect(canvas.getByRole('radio', { name: 'Two-way' })).toBeChecked();
  },
};

/** Picking a different radio fires onChange with that mode. */
export const PickMode: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('radio', { name: 'Pull only' }));
    await expect(args.onChange).toHaveBeenCalledWith('pull');
  },
};

/** Disabled — every radio is inert. */
export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    for (const radio of canvas.getAllByRole('radio')) {
      await expect(radio).toBeDisabled();
    }
  },
};

/**
 * The one-shot push button. Opening it reveals an AlertDialog (portalled to
 * document.body) to choose create-missing vs overwrite; confirming calls
 * `onPush` with the picked mode. The dialog is cancelled before the play
 * function ends so the trigger is not left behind an open dialog when the
 * post-play a11y check runs.
 */
export const PushButton: StoryObj<typeof PushLibraryButton> = {
  args: { provider: 'anilist', onPush: fn() },
  argTypes: {
    provider: { control: 'inline-radio', options: ['anilist', 'mal'] },
    onPush: { description: 'Fires with the chosen push mode (create-missing / overwrite).' },
    disabled: { control: 'boolean' },
  },
  render: args => <PushLibraryButton {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Push library…' }));

    const body = within(canvasElement.ownerDocument.body);
    const dialog = await body.findByRole('alertdialog');
    await expect(dialog).toBeInTheDocument();
    await expect(body.getByRole('radio', { name: /Only add missing/ })).toBeInTheDocument();

    // Cancel so the trigger isn't aria-hidden behind the open dialog when axe
    // runs after play.
    await userEvent.click(await body.findByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(body.queryByRole('alertdialog')).not.toBeInTheDocument());
  },
};

/** Confirming the push dialog calls onPush with the chosen mode. */
export const PushConfirm: StoryObj<typeof PushLibraryButton> = {
  args: { provider: 'anilist', onPush: fn() },
  render: args => <PushLibraryButton {...args} />,
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Push library…' }));

    const body = within(canvasElement.ownerDocument.body);
    await body.findByRole('alertdialog');
    await userEvent.click(body.getByRole('button', { name: 'Push' }));
    await expect(args.onPush).toHaveBeenCalledWith('create-missing');
    await waitFor(() => expect(body.queryByRole('alertdialog')).not.toBeInTheDocument());
  },
};
