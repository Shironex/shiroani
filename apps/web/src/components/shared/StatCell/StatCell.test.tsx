import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { StatCell } from '@/components/shared/StatCell';

describe('StatCell', () => {
  it('renders the label, value and optional sub descriptor', () => {
    render(<StatCell label="Watched" value={184} sub="of 220" />);
    expect(screen.getByText('Watched')).toBeInTheDocument();
    expect(screen.getByText('184')).toBeInTheDocument();
    expect(screen.getByText('of 220')).toBeInTheDocument();
  });
});
