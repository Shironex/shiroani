import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { DIARY_GRADIENTS } from '@/lib/diary-constants';
import GradientPicker from './GradientPicker';

const GRADIENT_COUNT = Object.keys(DIARY_GRADIENTS).length;

describe('GradientPicker', () => {
  it('renders a labelled swatch for every gradient', () => {
    render(<GradientPicker value={undefined} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Sakura' })).toBeInTheDocument();
    // Every gradient swatch is a button (the Clear control is absent here).
    expect(screen.getAllByRole('button')).toHaveLength(GRADIENT_COUNT);
  });

  it('reflects the active selection with aria-pressed on exactly one swatch', () => {
    render(<GradientPicker value="sakura" onChange={vi.fn()} />);
    const pressed = screen
      .getAllByRole('button')
      .filter(b => b.getAttribute('aria-pressed') === 'true');
    expect(pressed).toHaveLength(1);
    expect(pressed[0]).toHaveAttribute('aria-label', 'Sakura');
  });

  it('emits the picked gradient when an inactive swatch is clicked', async () => {
    const onChange = vi.fn();
    const { user } = render(<GradientPicker value={undefined} onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: 'Ocean' }));
    expect(onChange).toHaveBeenCalledWith('ocean');
  });

  it('clears the value when the active swatch is clicked again', async () => {
    const onChange = vi.fn();
    const { user } = render(<GradientPicker value="sakura" onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: 'Sakura' }));
    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  it('shows a Clear control only when a gradient is set', async () => {
    const onChange = vi.fn();
    const { user, rerender } = render(<GradientPicker value="sakura" onChange={onChange} />);
    const clear = screen.getByRole('button', { name: 'Clear' });
    await user.click(clear);
    expect(onChange).toHaveBeenCalledWith(undefined);

    rerender(<GradientPicker value={undefined} onChange={onChange} />);
    expect(screen.queryByRole('button', { name: 'Clear' })).not.toBeInTheDocument();
  });
});
