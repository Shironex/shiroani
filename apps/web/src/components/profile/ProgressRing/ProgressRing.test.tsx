import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import ProgressRing from './ProgressRing';

describe('ProgressRing', () => {
  it('renders the default rounded percentage label and an optional label', () => {
    render(<ProgressRing value={63.4} label="COMPLETED" />);
    expect(screen.getByText('63%')).toBeInTheDocument();
    expect(screen.getByText('COMPLETED')).toBeInTheDocument();
  });

  it('honours a valueLabel override and clamps out-of-range values', () => {
    render(<ProgressRing value={150} valueLabel="full" />);
    expect(screen.getByText('full')).toBeInTheDocument();
  });
});
