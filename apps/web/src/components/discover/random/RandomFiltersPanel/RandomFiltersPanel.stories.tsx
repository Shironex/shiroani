import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn } from 'storybook/test';
import RandomFiltersPanel from './RandomFiltersPanel';

/**
 * Genre filter panel for the Random tab — a disclosure header (with an
 * include/exclude count summary) over the reused tri-state GenrePicker. Expanded
 * by default. The header is a button with `aria-expanded` and the chips carry
 * accessible names, so axe runs clean.
 */
const meta = {
  title: 'discover/random/RandomFiltersPanel',
  component: RandomFiltersPanel,
  parameters: { a11y: { test: 'error' } },
  args: { included: ['Action'], excluded: ['Horror'], disabled: false, onChange: fn() },
  argTypes: {
    included: { description: 'Genres in the "included" state.' },
    excluded: { description: 'Genres in the "excluded" state.' },
    disabled: {
      control: 'boolean',
      description: 'Disables the genre chips while a fetch is loading.',
    },
    onChange: { description: 'Called with the next (included, excluded) lists.' },
  },
} satisfies Meta<typeof RandomFiltersPanel>;

export default meta;

type Story = StoryObj<typeof RandomFiltersPanel>;

/** Expanded — toggling a genre forwards the next selection, and the header collapses the picker. */
export const Default: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('+1')).toBeInTheDocument();

    await userEvent.click(canvas.getByRole('button', { name: /Comedy/ }));
    await expect(args.onChange).toHaveBeenCalledWith(['Action', 'Comedy'], ['Horror']);

    // The disclosure header collapses the picker.
    await userEvent.click(canvas.getByRole('button', { name: /genres/i }));
    await expect(canvas.queryByRole('button', { name: /Horror/ })).not.toBeInTheDocument();
  },
};
