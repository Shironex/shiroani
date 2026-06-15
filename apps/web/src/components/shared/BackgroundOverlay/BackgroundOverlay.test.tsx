import { describe, expect, it } from 'vitest';
import { render } from '@/test/test-utils';
import { BackgroundOverlay } from '@/components/shared/BackgroundOverlay';

describe('BackgroundOverlay', () => {
  it('renders a fixed, aria-hidden overlay', () => {
    const { container } = render(<BackgroundOverlay />);
    const root = container.querySelector('[aria-hidden="true"]');
    expect(root).toBeInTheDocument();
    expect(root).toHaveClass('fixed');
  });
});
