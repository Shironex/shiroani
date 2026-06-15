import { describe, expect, it } from 'vitest';
import { render } from '@/test/test-utils';
import { AppBackground } from '@/components/shared/AppBackground';

describe('AppBackground', () => {
  it('renders a decorative, aria-hidden backdrop', () => {
    const { container } = render(<AppBackground />);
    const root = container.querySelector('[aria-hidden="true"]');
    expect(root).toBeInTheDocument();
    expect(root).toHaveClass('pointer-events-none');
  });
});
