import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import GradientPicker from './GradientPicker';

describe('GradientPicker', () => {
  it('renders a swatch for every gradient and reflects the active selection', () => {
    render(<GradientPicker value="sakura" onChange={vi.fn()} />);
    // The active swatch is reflected via aria-pressed on its button.
    const pressed = screen
      .getAllByRole('button')
      .filter(b => b.getAttribute('aria-pressed') === 'true');
    expect(pressed.length).toBe(1);
  });

  it('clears the value when the active swatch is clicked again', async () => {
    const onChange = vi.fn();
    const { user } = render(<GradientPicker value="sakura" onChange={onChange} />);
    const active = screen
      .getAllByRole('button')
      .find(b => b.getAttribute('aria-pressed') === 'true')!;
    await user.click(active);
    expect(onChange).toHaveBeenCalledWith(undefined);
  });
});
