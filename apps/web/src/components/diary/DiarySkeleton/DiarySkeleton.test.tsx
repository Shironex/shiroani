import { describe, expect, it } from 'vitest';
import { render } from '@/test/test-utils';
import DiarySkeleton from './DiarySkeleton';

describe('DiarySkeleton', () => {
  it('renders a busy placeholder rail', () => {
    const { container } = render(<DiarySkeleton />);

    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  });
});
