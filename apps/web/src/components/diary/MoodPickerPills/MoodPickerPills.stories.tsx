import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn, waitFor } from 'storybook/test';
import MoodPickerPills from './MoodPickerPills';

/**
 * Shared mood picker used in the diary editor's left rail (`sm` — labelled
 * emoji pills) and toolbar (`xs` — emoji-only tiles). Each option is a toggle
 * button (`aria-pressed`); clicking the active mood clears it (emits
 * `undefined`).
 */
const meta = {
  title: 'diary/MoodPickerPills',
  component: MoodPickerPills,
  args: {
    onChange: fn(),
  },
  argTypes: {
    value: {
      control: 'select',
      options: [undefined, 'great', 'good', 'neutral', 'bad', 'terrible'],
      description: 'The currently selected mood, or undefined when none is set.',
    },
    size: {
      control: 'inline-radio',
      options: ['sm', 'xs'],
      description: '`sm` labelled pills (rail) vs. `xs` emoji-only tiles (toolbar).',
    },
    onChange: { description: 'Called with the next mood, or undefined when toggled off.' },
  },
  parameters: {
    // Each pill is a labelled toggle button with aria-pressed. Passes axe clean.
    a11y: { test: 'error' },
  },
} satisfies Meta<typeof MoodPickerPills>;

export default meta;

type Story = StoryObj<typeof MoodPickerPills>;

/** Labelled pills with one mood active. */
export const Default: Story = {
  args: { value: 'great', size: 'sm' },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    // Clicking the active mood toggles it off (emits undefined).
    const active = canvas.getByRole('button', { name: 'Great' });
    await expect(active).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(active);
    await waitFor(() => expect(args.onChange).toHaveBeenCalledWith(undefined));
  },
};

/** Compact emoji-only tiles with no mood selected. */
export const Compact: Story = {
  args: { value: undefined, size: 'xs' },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    // Picking a mood from the inactive set emits that mood value.
    await userEvent.click(canvas.getByRole('button', { name: 'Good' }));
    await waitFor(() => expect(args.onChange).toHaveBeenCalledWith('good'));
  },
};
