import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import ProgressRing from './ProgressRing';

describe('ProgressRing', () => {
  it('renders the default rounded percentage label and an optional label', () => {
    render(<ProgressRing value={63.4} label="COMPLETED" />);
    expect(screen.getByText('63%')).toBeInTheDocument();
    expect(screen.getByText('COMPLETED')).toBeInTheDocument();
  });

  it('honours a valueLabel override', () => {
    render(<ProgressRing value={42} valueLabel="full" />);
    expect(screen.getByText('full')).toBeInTheDocument();
    // The default rounded percentage is replaced, not appended.
    expect(screen.queryByText('42%')).not.toBeInTheDocument();
  });

  it('clamps values above 100 to a full ring', () => {
    render(<ProgressRing value={150} />);
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('clamps negative values to an empty ring', () => {
    render(<ProgressRing value={-20} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('hides the centred value when valueLabel is an empty string', () => {
    const { container } = render(<ProgressRing value={50} valueLabel="" label="WATCHING" />);
    // The label caption still renders, but no centred value text.
    expect(screen.getByText('WATCHING')).toBeInTheDocument();
    expect(screen.queryByText('50%')).not.toBeInTheDocument();
    // Only the caption text node — no centred percentage overlay.
    expect(container.querySelector('.absolute.inset-0')).toBeNull();
  });

  it('drives the dash offset from the clamped value', () => {
    const { container } = render(<ProgressRing value={0} />);
    const arc = container.querySelectorAll('circle')[1];
    // At 0% the filled arc is fully offset (offset === circumference).
    const dasharray = arc.getAttribute('stroke-dasharray');
    const dashoffset = arc.getAttribute('stroke-dashoffset');
    expect(dashoffset).toBe(dasharray);
  });

  it('marks the decorative SVG arc as aria-hidden', () => {
    const { container } = render(<ProgressRing value={50} label="COMPLETED" />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});
