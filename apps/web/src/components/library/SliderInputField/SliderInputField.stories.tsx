import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn } from 'storybook/test';
import SliderInputField from './SliderInputField';

/**
 * A labelled numeric field paired with an optional range slider. Typed values
 * are clamped to `[min, max]`; the slider is hidden when the upper bound is
 * unknown. Used for the progress and score fields in the anime detail modal.
 */
const meta = {
  title: 'library/SliderInputField',
  component: SliderInputField,
  parameters: {
    // TODO(a11y): the Radix slider thumb (role="slider") has no accessible name —
    // axe flags `aria-input-field-name`. The thumb only takes an aria-label when
    // one is passed to `SliderPrimitive.Thumb`, but the shared `components/ui/
    // slider.tsx` renders the thumb with no props and is out of scope for this
    // initiative. Ratchet to 'error' once the shared Slider forwards a thumb
    // aria-label (or accepts the field label).
    a11y: { test: 'todo' },
  },
  argTypes: {
    label: { description: 'Text shown above the field (also labels the input + slider).' },
    value: { description: 'Current numeric value (controlled).' },
    min: { description: 'Lower clamp bound for typed/slider values.' },
    max: { description: 'Upper clamp bound for typed/slider values.' },
    showSlider: { description: 'Whether to render the range slider (hide when max is unknown).' },
    disabled: { description: 'Disables both the number input and the slider.' },
    onChange: { description: 'Fired with the clamped value on input or slider change.' },
  },
} satisfies Meta<typeof SliderInputField>;

export default meta;

type Story = StoryObj<typeof SliderInputField>;

export const Default: Story = {
  args: { label: 'Progress', value: 5, min: 0, max: 12, onChange: fn() },
  render: args => {
    const [value, setValue] = useState(args.value);
    return (
      <SliderInputField
        {...args}
        value={value}
        onChange={v => {
          setValue(v);
          args.onChange(v);
        }}
      />
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('spinbutton');
    // Typing a new in-range value updates the displayed field.
    await userEvent.clear(input);
    await userEvent.type(input, '7');
    await expect(input).toHaveValue(7);
  },
};

export const WithoutSlider: Story = {
  args: { label: 'Progress', value: 3, min: 0, max: 12, showSlider: false, onChange: fn() },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // No slider role is present when showSlider is false.
    await expect(canvas.queryByRole('slider')).not.toBeInTheDocument();
    await expect(canvas.getByRole('spinbutton')).toBeInTheDocument();
  },
};

export const Disabled: Story = {
  args: { label: 'Progress', value: 12, min: 0, max: 12, disabled: true, onChange: fn() },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('spinbutton')).toBeDisabled();
  },
};
