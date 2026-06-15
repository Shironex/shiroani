import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn, waitFor } from 'storybook/test';
import { DEFAULT_DISCORD_TEMPLATES } from '@shiroani/shared';
import DiscordTemplateEditor from './DiscordTemplateEditor';

/**
 * Per-activity Discord presence template editor. An activity-type Select (Radix
 * combobox, options portalled to the document body) chooses which template the
 * two text inputs (line 1 / line 2) and three option toggles edit. Every change
 * is reported through `onTemplateChange` / `onActivityChange`; the Restore
 * defaults button fires `onReset`. The component is fully controlled — the
 * parent owns `selectedActivity` and `currentTemplate`.
 */
const meta = {
  title: 'settings/DiscordTemplateEditor',
  component: DiscordTemplateEditor,
  parameters: {
    // Inputs carry visible labels and toggles carry aria-labels; the activity
    // Select trigger is a labelled combobox, so axe passes clean.
    a11y: { test: 'error' },
  },
  argTypes: {
    selectedActivity: {
      control: 'select',
      options: ['watching', 'browsing', 'library', 'diary', 'schedule', 'settings', 'idle'],
      description: 'Activity type whose template is being edited.',
    },
    currentTemplate: {
      control: 'object',
      description: 'Template fields for the selected activity.',
    },
    onActivityChange: { description: 'Called with the new activity type when the Select changes.' },
    onTemplateChange: {
      description: 'Called with (activity, field, value) when an input or toggle changes.',
    },
    onReset: { description: 'Called when Restore defaults is clicked.' },
  },
  args: {
    selectedActivity: 'watching',
    currentTemplate: {
      details: 'Watching anime',
      state: '{anime_title}',
      showTimestamp: true,
      showLargeImage: true,
      showButton: true,
    },
    onActivityChange: fn(),
    onTemplateChange: fn(),
    onReset: fn(),
  },
} satisfies Meta<typeof DiscordTemplateEditor>;

export default meta;

type Story = StoryObj<typeof DiscordTemplateEditor>;

/** Default editor for the watching template. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { name: 'Status templates' })).toBeInTheDocument();
    await expect(canvas.getByDisplayValue('Watching anime')).toBeInTheDocument();
    await expect(canvas.getByRole('combobox')).toHaveTextContent('Watching anime');
  },
};

/** Picking a different activity type from the Select reports it upward. */
export const SelectActivity: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);
    // Open the Radix Select; its options portal to document.body.
    await userEvent.click(canvas.getByRole('combobox'));
    const option = await body.findByRole('option', { name: 'Library' });
    await userEvent.click(option);
    await waitFor(() => expect(args.onActivityChange).toHaveBeenCalledWith('library'));
  },
};

/** Typing in line 1 reports the change for the details field. */
export const EditLine: Story = {
  args: {
    currentTemplate: { ...DEFAULT_DISCORD_TEMPLATES.watching, details: '' },
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const line1 = canvas.getByPlaceholderText('e.g. Watching anime');
    await userEvent.type(line1, 'Z');
    await waitFor(() =>
      expect(args.onTemplateChange).toHaveBeenCalledWith('watching', 'details', 'Z')
    );
  },
};

/** Toggling an option switch reports the new boolean for that field. */
export const ToggleOption: Story = {
  args: {
    currentTemplate: { ...DEFAULT_DISCORD_TEMPLATES.watching, showLargeImage: false },
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('switch', { name: 'Anime cover' }));
    await waitFor(() =>
      expect(args.onTemplateChange).toHaveBeenCalledWith('watching', 'showLargeImage', true)
    );
  },
};
