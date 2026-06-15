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
});
