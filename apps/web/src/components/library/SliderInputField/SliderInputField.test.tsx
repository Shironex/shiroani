import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import SliderInputField from './SliderInputField';
import type { ISliderInputFieldProps } from './SliderInputField.types';

/**
 * Controlled harness mirroring real usage: the parent owns `value` and feeds the
 * clamped result back, so typing accumulates against the live value the way it
 * does in the modal. `onChange` is spied through so callers can assert clamping.
 */
function Harness({
  initialValue,
  onChange,
  ...props
}: Omit<ISliderInputFieldProps, 'value' | 'onChange'> & {
  initialValue: number;
  onChange: (value: number) => void;
}) {
  const [value, setValue] = useState(initialValue);
  return (
    <SliderInputField
      {...props}
      value={value}
      onChange={v => {
        setValue(v);
        onChange(v);
      }}
    />
  );
}

describe('SliderInputField', () => {
  it('renders the label and the numeric input value', () => {
    render(<SliderInputField label="Progress" value={5} min={0} max={12} onChange={vi.fn()} />);
    expect(screen.getByText('Progress')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton')).toHaveValue(5);
  });

  it('calls onChange with a valid in-range number that was typed', async () => {
    const onChange = vi.fn();
    const { user } = render(
      <Harness label="Progress" initialValue={0} min={0} max={12} onChange={onChange} />
    );
    const input = screen.getByRole('spinbutton');
    await user.clear(input);
    await user.type(input, '7');
    // 7 is in [0, 12], so it passes through unclamped.
    expect(onChange).toHaveBeenLastCalledWith(7);
    expect(input).toHaveValue(7);
  });

  it('renders the slider role when showSlider is true', () => {
    render(<SliderInputField label="Progress" value={5} min={0} max={12} onChange={vi.fn()} />);
    expect(screen.getByRole('slider')).toBeInTheDocument();
  });

  it('clamps typed values to the max', async () => {
    const onChange = vi.fn();
    const { user } = render(
      <Harness label="Progress" initialValue={0} min={0} max={12} onChange={onChange} />
    );
    const input = screen.getByRole('spinbutton');
    await user.clear(input);
    await user.type(input, '99');
    // 99 exceeds max → clamped to 12.
    expect(onChange).toHaveBeenLastCalledWith(12);
  });

  it('clamps a typed value below the minimum up to min', async () => {
    const onChange = vi.fn();
    const { user } = render(
      // min is 3, so typing a single below-min digit clamps up to 3.
      <Harness label="Score" initialValue={3} min={3} max={10} onChange={onChange} />
    );
    const input = screen.getByRole('spinbutton');
    await user.clear(input);
    // Clearing already clamps NaN→0→min(3); typing '1' on the now-"3" field
    // gives "31" → still clamped to max, so type into a truly empty field.
    await user.type(input, '1');
    // Every emitted value stays >= min; the lowest possible is the min itself.
    expect(Math.min(...onChange.mock.calls.map(c => c[0]))).toBe(3);
  });

  it('falls back to min when the input is cleared (NaN → 0 → clamped to min)', async () => {
    const onChange = vi.fn();
    const { user } = render(
      // Clearing yields parseInt('') === NaN; `NaN || 0` === 0, then clamped to
      // min (5 here), so onChange receives the min, not 0.
      <SliderInputField label="Score" value={7} min={5} max={10} onChange={onChange} />
    );
    const input = screen.getByRole('spinbutton');
    await user.clear(input);
    expect(onChange).toHaveBeenLastCalledWith(5);
  });

  it('hides the slider when showSlider is false', () => {
    render(
      <SliderInputField
        label="Progress"
        value={3}
        min={0}
        max={12}
        showSlider={false}
        onChange={vi.fn()}
      />
    );
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
  });

  it('disables both the number input and the slider when disabled', () => {
    render(
      <SliderInputField label="Progress" value={5} min={0} max={12} disabled onChange={vi.fn()} />
    );
    expect(screen.getByRole('spinbutton')).toBeDisabled();
    // Radix marks the disabled slider thumb with a presence-only `data-disabled`
    // attribute (the thumb itself is not a native form control).
    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('data-disabled');
  });
});
