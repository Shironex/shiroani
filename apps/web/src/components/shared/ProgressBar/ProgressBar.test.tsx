import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { ProgressBar } from '@/components/shared/ProgressBar';

describe('ProgressBar', () => {
  it('clamps the value into 0–100 and exposes it via aria-valuenow', () => {
    render(<ProgressBar value={140} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  });

  it('omits aria-valuenow when indeterminate', () => {
    render(<ProgressBar indeterminate />);
    expect(screen.getByRole('progressbar')).not.toHaveAttribute('aria-valuenow');
  });
});
