import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import GenrePicker from './GenrePicker';

describe('GenrePicker', () => {
  it('cycles a neutral genre to included on click', async () => {
    const onChange = vi.fn();
    const { user } = render(<GenrePicker included={[]} excluded={[]} onChange={onChange} />);

    await user.click(screen.getByText('Action'));

    expect(onChange).toHaveBeenCalledWith(['Action'], []);
  });

  it('cycles an included genre to excluded on the next click', async () => {
    const onChange = vi.fn();
    const { user } = render(
      <GenrePicker included={['Action']} excluded={[]} onChange={onChange} />
    );

    await user.click(screen.getByText('Action'));

    expect(onChange).toHaveBeenCalledWith([], ['Action']);
  });

  it('cycles an excluded genre back to neutral on the third click', async () => {
    const onChange = vi.fn();
    const { user } = render(
      <GenrePicker included={[]} excluded={['Action']} onChange={onChange} />
    );

    await user.click(screen.getByText('Action'));

    expect(onChange).toHaveBeenCalledWith([], []);
  });

  it('jumps straight to excluded on right-click', async () => {
    const onChange = vi.fn();
    const { user } = render(<GenrePicker included={[]} excluded={[]} onChange={onChange} />);

    await user.pointer({ keys: '[MouseRight]', target: screen.getByText('Action') });

    expect(onChange).toHaveBeenCalledWith([], ['Action']);
  });

  it('reflects included/excluded state via aria-pressed', () => {
    render(<GenrePicker included={['Action']} excluded={['Horror']} onChange={vi.fn()} />);

    expect(screen.getByText('Action').closest('button')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Horror').closest('button')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Comedy').closest('button')).toHaveAttribute('aria-pressed', 'false');
  });

  it('does not fire onChange when disabled', async () => {
    const onChange = vi.fn();
    const { user } = render(
      <GenrePicker included={[]} excluded={[]} onChange={onChange} disabled />
    );

    await user.click(screen.getByText('Action'));

    expect(onChange).not.toHaveBeenCalled();
  });
});
