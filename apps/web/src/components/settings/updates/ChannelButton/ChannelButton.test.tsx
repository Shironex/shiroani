import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { ChannelButton } from './index';

describe('ChannelButton', () => {
  it('renders its children and fires onClick', async () => {
    const onClick = vi.fn();
    const { user } = render(
      <ChannelButton active onClick={onClick}>
        Stable
      </ChannelButton>
    );
    const button = screen.getByRole('button', { name: 'Stable' });
    expect(button).toBeInTheDocument();
    await user.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('reflects the active state through aria-pressed', () => {
    render(
      <ChannelButton active onClick={vi.fn()}>
        Stable
      </ChannelButton>
    );
    expect(screen.getByRole('button', { name: 'Stable' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('marks an inactive channel with aria-pressed false', () => {
    render(
      <ChannelButton active={false} onClick={vi.fn()}>
        Beta
      </ChannelButton>
    );
    expect(screen.getByRole('button', { name: 'Beta' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('does not fire onClick when disabled', async () => {
    const onClick = vi.fn();
    const { user } = render(
      <ChannelButton active={false} disabled onClick={onClick}>
        Beta
      </ChannelButton>
    );
    const button = screen.getByRole('button', { name: 'Beta' });
    expect(button).toBeDisabled();
    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});
