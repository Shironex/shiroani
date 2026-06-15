import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import SliderInputField from './SliderInputField';

describe('SliderInputField', () => {
  it('renders the label and the numeric input value', () => {
    render(<SliderInputField label="Progress" value={5} min={0} max={12} onChange={vi.fn()} />);
    expect(screen.getByText('Progress')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton')).toHaveValue(5);
  });

  it('clamps typed values to the min/max range', async () => {
    const onChange = vi.fn();
    const { user } = render(
      <SliderInputField label="Progress" value={5} min={0} max={12} onChange={onChange} />
    );
    const input = screen.getByRole('spinbutton');
    await user.clear(input);
    await user.type(input, '99');
    // Last keystroke produces value 99 → clamped to max 12.
    expect(onChange).toHaveBeenLastCalledWith(12);
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
});
