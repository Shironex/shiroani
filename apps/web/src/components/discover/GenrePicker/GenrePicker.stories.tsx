import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn } from 'storybook/test';
import GenrePicker from './GenrePicker';

/**
 * Tri-state genre chip grid. Each chip is a toggle button that cycles
 * neutral → included → excluded → neutral on click (right-click jumps straight
 * to excluded). State is mirrored through `aria-pressed` and a descriptive
 * `aria-label`, so axe runs clean.
 */
const meta = {
  title: 'discover/GenrePicker',
  component: GenrePicker,
  parameters: { a11y: { test: 'error' } },
  args: { included: ['Action'], excluded: ['Horror'], onChange: fn() },
  argTypes: {
    included: { description: 'Genres in the "included" state.' },
    excluded: { description: 'Genres in the "excluded" state.' },
    onChange: { description: 'Called with the next (included, excluded) genre lists.' },
    disabled: { control: 'boolean', description: 'Disables every chip.' },
  },
} satisfies Meta<typeof GenrePicker>;

export default meta;

type Story = StoryObj<typeof GenrePicker>;

/** Clicking a neutral chip cycles it into the included state. */
export const Default: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    // Pre-seeded state is mirrored in aria-pressed.
    await expect(canvas.getByRole('button', { name: /Action/ })).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    const comedy = canvas.getByRole('button', { name: /Comedy/ });
    await expect(comedy).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(comedy);
    await expect(args.onChange).toHaveBeenCalledWith(['Action', 'Comedy'], ['Horror']);
  },
};

/** Disabled — chips render their state but do not respond to clicks. */
export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /Comedy/ }));
    await expect(args.onChange).not.toHaveBeenCalled();
  },
};
