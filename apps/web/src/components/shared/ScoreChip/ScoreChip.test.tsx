import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { ScoreChip } from '@/components/shared/ScoreChip';

describe('ScoreChip', () => {
  it('renders the score value', () => {
    render(<ScoreChip value="8.4" />);
    expect(screen.getByText('8.4')).toBeInTheDocument();
  });

  it('applies the scrim background class when scrim is set', () => {
    render(<ScoreChip value="8.4" scrim />);
    const el = screen.getByText('8.4').parentElement;
    expect(el).toHaveClass('bg-black/70');
  });

  it('omits the scrim background class by default', () => {
    render(<ScoreChip value="8.4" />);
    const el = screen.getByText('8.4').parentElement;
    expect(el).not.toHaveClass('bg-black/70');
  });

  it('merges a custom className with the base classes', () => {
    render(<ScoreChip value="8.4" className="absolute top-2 right-2" />);
    const el = screen.getByText('8.4').parentElement;
    expect(el).toHaveClass('absolute');
    expect(el).toHaveClass('font-mono');
  });
});
