import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { SelectableChipButton } from './index';

describe('SelectableChipButton', () => {
  it('renders its children and fires onClick', async () => {
    const onClick = vi.fn();
    const { user } = render(
      <SelectableChipButton active onClick={onClick}>
        100%
      </SelectableChipButton>
    );
    const button = screen.getByRole('button', { name: '100%' });
    expect(button).toBeInTheDocument();
    await user.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('reflects the active state through aria-pressed and the selected coloring', () => {
    render(
      <SelectableChipButton active onClick={vi.fn()}>
        100%
      </SelectableChipButton>
    );
    const button = screen.getByRole('button', { name: '100%' });
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(button.className).toContain('border-primary/35');
  });

  it('marks an inactive chip with aria-pressed false and idle coloring', () => {
    render(
      <SelectableChipButton active={false} onClick={vi.fn()}>
        110%
      </SelectableChipButton>
    );
    const button = screen.getByRole('button', { name: '110%' });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(button.className).not.toContain('border-primary/35');
  });

  it('does not fire onClick when disabled', async () => {
    const onClick = vi.fn();
    const { user } = render(
      <SelectableChipButton active={false} disabled onClick={onClick}>
        Beta
      </SelectableChipButton>
    );
    const button = screen.getByRole('button', { name: 'Beta' });
    expect(button).toBeDisabled();
    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('merges a caller className onto the chip', () => {
    render(
      <SelectableChipButton active={false} onClick={vi.fn()} className="py-1.5 text-xs">
        English
      </SelectableChipButton>
    );
    const button = screen.getByRole('button', { name: 'English' });
    expect(button.className).toContain('py-1.5');
    expect(button.className).toContain('text-xs');
  });
});
