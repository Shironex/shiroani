import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { ProgressBar } from '@/components/shared/ProgressBar';

describe('ProgressBar', () => {
  it('exposes progressbar semantics with the standard 0–100 range', () => {
    render(<ProgressBar value={50} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
    expect(bar).toHaveAttribute('aria-valuenow', '50');
  });

  it('defaults to 0% when no value is provided', () => {
    render(<ProgressBar />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '0');
    const fill = bar.firstElementChild as HTMLElement;
    expect(fill.style.width).toBe('0%');
  });

  it('clamps values above 100 down to 100', () => {
    render(<ProgressBar value={140} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '100');
    expect((bar.firstElementChild as HTMLElement).style.width).toBe('100%');
  });

  it('clamps negative values up to 0', () => {
    render(<ProgressBar value={-20} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '0');
    expect((bar.firstElementChild as HTMLElement).style.width).toBe('0%');
  });

  it('sets the fill width to the clamped value for in-range input', () => {
    render(<ProgressBar value={64} />);
    const fill = screen.getByRole('progressbar').firstElementChild as HTMLElement;
    expect(fill.style.width).toBe('64%');
  });

  it('applies the requested thickness as the track height', () => {
    render(<ProgressBar value={50} thickness={8} />);
    expect(screen.getByRole('progressbar')).toHaveStyle({ height: '8px' });
  });

  it('uses the primary tone fill by default', () => {
    render(<ProgressBar value={50} />);
    const fill = screen.getByRole('progressbar').firstElementChild as HTMLElement;
    expect(fill).toHaveClass('bg-primary');
  });

  it('switches the fill class for the info tone', () => {
    render(<ProgressBar value={50} tone="info" />);
    const fill = screen.getByRole('progressbar').firstElementChild as HTMLElement;
    expect(fill).toHaveClass('bg-[var(--status-info)]');
  });

  it('switches the fill class for the muted tone', () => {
    render(<ProgressBar value={50} tone="muted" />);
    const fill = screen.getByRole('progressbar').firstElementChild as HTMLElement;
    expect(fill).toHaveClass('bg-muted-foreground/60');
  });

  it('adds the glow shadow only when glow is enabled', () => {
    const { rerender } = render(<ProgressBar value={50} glow />);
    let fill = screen.getByRole('progressbar').firstElementChild as HTMLElement;
    expect(fill.className).toContain('shadow-[0_0_8px');

    rerender(<ProgressBar value={50} />);
    fill = screen.getByRole('progressbar').firstElementChild as HTMLElement;
    expect(fill.className).not.toContain('shadow-[0_0_8px');
  });

  it('omits aria-valuenow and renders the sliding indicator when indeterminate', () => {
    render(<ProgressBar indeterminate />);
    const bar = screen.getByRole('progressbar');
    expect(bar).not.toHaveAttribute('aria-valuenow');
    // Indeterminate fill is a fixed-width sliding gradient, not a value-driven width.
    const slider = bar.firstElementChild as HTMLElement;
    expect(slider.style.width).toBe('30%');
    expect(slider.className).toContain('animate-[progress-slide');
  });

  it('ignores the value when indeterminate', () => {
    render(<ProgressBar indeterminate value={75} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).not.toHaveAttribute('aria-valuenow');
  });

  it('always exposes an accessible name (falls back to a default label)', () => {
    render(<ProgressBar value={50} />);
    // Generic default so the progressbar is never nameless for screen readers.
    expect(screen.getByRole('progressbar', { name: 'Progress' })).toBeInTheDocument();
  });

  it('uses a caller-supplied aria-label as the accessible name', () => {
    render(<ProgressBar value={50} aria-label="Postęp oglądania" />);
    expect(screen.getByRole('progressbar', { name: 'Postęp oglądania' })).toBeInTheDocument();
  });

  it('names the indeterminate bar too', () => {
    render(<ProgressBar indeterminate aria-label="Ładowanie" />);
    expect(screen.getByRole('progressbar', { name: 'Ładowanie' })).toBeInTheDocument();
  });
});
