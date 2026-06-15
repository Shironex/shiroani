import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { AniListErrorState } from '@/components/shared/AniListErrorState';

describe('AniListErrorState', () => {
  it('renders nothing when there is no error', () => {
    const { container } = render(<AniListErrorState error={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a retry button that fires onRetry', async () => {
    const onRetry = vi.fn();
    const { user } = render(<AniListErrorState error="Failed to fetch" onRetry={onRetry} />);
    const button = screen.getByRole('button');
    await user.click(button);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
