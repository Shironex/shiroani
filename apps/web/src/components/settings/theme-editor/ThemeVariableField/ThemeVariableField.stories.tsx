import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn, waitFor } from 'storybook/test';
import ThemeVariableField from './ThemeVariableField';

/**
 * One editable theme variable. Color variables render a swatch + hex input
 * (via `ColorPickerField`); shadow strings in a text-only group render a mono
 * text input. Editing the value calls `onChange` with the new value. Renders
 * nothing for variables outside the known theme set.
 */
const meta = {
  title: 'settings/theme-editor/ThemeVariableField',
  component: ThemeVariableField,
  argTypes: {
    varName: { control: 'text', description: 'CSS variable name (without the `--` prefix).' },
    value: { control: 'text', description: 'Current value (oklch for colors, raw for shadows).' },
    group: { control: false, description: 'The variable group (decides color vs text input).' },
  },
  parameters: {
    a11y: { test: 'error' },
  },
} satisfies Meta<typeof ThemeVariableField>;

export default meta;

type Story = StoryObj<typeof ThemeVariableField>;

/** A color variable — swatch + hex input. */
export const ColorVariable: Story = {
  args: {
    varName: 'primary',
    group: { labelKey: 'main', variables: ['primary'] },
    value: 'oklch(0.6 0.2 280)',
    onChange: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Primary')).toBeInTheDocument();
    // Typing a valid hex into the hex field commits an oklch value via onChange.
    const hex = canvas.getByRole('textbox', { name: /Kod heksadecymalny: Primary/ });
    await userEvent.clear(hex);
    await userEvent.type(hex, '#ff0000');
    await waitFor(() => expect(args.onChange).toHaveBeenCalled());
  },
};

/** A shadow (text-only) variable — a mono text input. */
export const ShadowVariable: Story = {
  args: {
    varName: 'shadow-sm',
    group: { labelKey: 'shadows', variables: ['shadow-sm'], isTextOnly: true },
    value: '0 1px 2px rgb(0 0 0 / 0.1)',
    onChange: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText('Shadow Sm');
    await userEvent.type(input, '!');
    await waitFor(() => expect(args.onChange).toHaveBeenCalled());
  },
};
