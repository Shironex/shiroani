import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn } from 'storybook/test';
import ColorPickerField from './ColorPickerField';

/**
 * A single theme-token color row used by the theme editor: a clickable swatch
 * that opens the native color picker, a hex text input, and the underlying
 * `oklch()` value shown as a mono caption. The stored value is oklch; the
 * swatch and hex input convert to/from hex for editing. Typing a complete hex
 * value (or picking from the native input) fires `onChange` with the converted
 * oklch string.
 */
const meta = {
  title: 'settings/ColorPickerField',
  component: ColorPickerField,
  parameters: {
    // The swatch button and hex input both carry accessible names, so axe
    // passes clean.
    a11y: { test: 'error' },
  },
  argTypes: {
    label: { description: 'Visible token name; also labels the swatch button and hex input.' },
    variableName: { description: 'CSS variable name shown in the mono caption line.' },
    value: { description: 'Current color as an `oklch()` CSS string (controlled).' },
    onChange: { description: 'Fired with the converted oklch string on hex or picker change.' },
  },
} satisfies Meta<typeof ColorPickerField>;

export default meta;

type Story = StoryObj<typeof ColorPickerField>;

export const Default: Story = {
  args: {
    label: 'Primary',
    variableName: 'primary',
    value: 'oklch(0.6 0.2 280)',
    onChange: fn(),
  },
};

/**
 * Typing a complete hex value converts it to oklch and reports it through
 * `onChange`; the controlled value updates to match.
 */
export const EditsHex: Story = {
  args: {
    label: 'Primary',
    variableName: 'primary',
    value: 'oklch(0.6 0.2 280)',
    onChange: fn(),
  },
  render: args => {
    const [value, setValue] = useState(args.value);
    return (
      <ColorPickerField
        {...args}
        value={value}
        onChange={v => {
          setValue(v);
          args.onChange(v);
        }}
      />
    );
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const hexInput = canvas.getByRole('textbox', { name: 'Kod heksadecymalny: Primary' });
    await userEvent.clear(hexInput);
    await userEvent.type(hexInput, '#ff0000');
    // A complete hex value drives onChange with an oklch string.
    await expect(args.onChange).toHaveBeenCalled();
    const lastCall = (args.onChange as ReturnType<typeof fn>).mock.calls.at(-1)?.[0];
    await expect(lastCall).toMatch(/^oklch\(/);
  },
};
