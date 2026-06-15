import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn, waitFor } from 'storybook/test';
import GradientPicker from './GradientPicker';

/**
 * Cover-gradient swatch picker for diary entries — a mono-label eyebrow plus a
 * row (or stacked column) of rounded color swatches, the active one carrying an
 * accent ring. Each swatch is a labelled toggle button (`aria-pressed`);
 * selecting the active swatch clears it, and a "Clear" control appears whenever
 * a gradient is set.
 */
const meta = {
  title: 'diary/GradientPicker',
  component: GradientPicker,
  args: {
    onChange: fn(),
  },
  argTypes: {
    value: {
      control: 'select',
      options: [undefined, 'sakura', 'twilight', 'ocean', 'matcha', 'amber'],
      description: 'The selected gradient id, or undefined when none is chosen.',
    },
    stacked: {
      control: 'boolean',
      description: 'Stack the swatches vertically (editor sidebar) instead of inline.',
    },
    onChange: { description: 'Called with the next gradient id, or undefined when cleared.' },
  },
  parameters: {
    // Color swatches carry aria-labels (their gradient names) + aria-pressed.
    // Passes axe clean.
    a11y: { test: 'error' },
  },
} satisfies Meta<typeof GradientPicker>;

export default meta;

type Story = StoryObj<typeof GradientPicker>;

/** Inline row with "Sakura" active. */
export const Default: Story = {
  args: { value: 'sakura' },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const active = canvas.getByRole('button', { name: 'Sakura' });
    await expect(active).toHaveAttribute('aria-pressed', 'true');
    // Picking a different swatch emits that gradient.
    await userEvent.click(canvas.getByRole('button', { name: 'Ocean' }));
    await waitFor(() => expect(args.onChange).toHaveBeenCalledWith('ocean'));
  },
};

/** Stacked layout with nothing selected (no Clear control shown). */
export const Stacked: Story = {
  args: { value: undefined, stacked: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // No gradient set → the Clear control is absent.
    await expect(canvas.queryByRole('button', { name: 'Clear' })).not.toBeInTheDocument();
  },
};
