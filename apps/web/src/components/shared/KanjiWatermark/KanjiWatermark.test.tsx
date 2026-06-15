import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { KanjiWatermark } from '@/components/shared/KanjiWatermark';

describe('KanjiWatermark', () => {
  it('renders the kanji glyph with the requested size and opacity', () => {
    render(<KanjiWatermark kanji="失" size={300} opacity={0.04} />);
    const glyph = screen.getByText('失');
    expect(glyph).toBeInTheDocument();
    expect(glyph).toHaveStyle({ fontSize: '300px', opacity: '0.04' });
  });

  it('applies the default size (220px) and opacity (0.06) when omitted', () => {
    render(<KanjiWatermark kanji="影" />);
    const glyph = screen.getByText('影');
    expect(glyph).toHaveStyle({ fontSize: '220px', opacity: '0.06' });
  });

  it('is decorative — aria-hidden and pointer-events: none', () => {
    render(<KanjiWatermark kanji="夢" />);
    const glyph = screen.getByText('夢');
    expect(glyph).toHaveAttribute('aria-hidden', 'true');
    expect(glyph).toHaveClass('pointer-events-none', 'select-none');
  });

  it('positions the glyph in the bottom-right corner by default', () => {
    render(<KanjiWatermark kanji="光" />);
    const glyph = screen.getByText('光');
    expect(glyph).toHaveClass('right-[-24px]', 'bottom-[-36px]');
  });

  it.each([
    ['tr', ['right-[-24px]', 'top-[-36px]']],
    ['bl', ['left-[-24px]', 'bottom-[-36px]']],
    ['tl', ['left-[-24px]', 'top-[-36px]']],
  ] as const)('maps position "%s" to the matching corner classes', (position, classes) => {
    render(<KanjiWatermark kanji="星" position={position} />);
    const glyph = screen.getByText('星');
    for (const cls of classes) expect(glyph).toHaveClass(cls);
  });

  it('merges a caller-supplied className alongside the positioning classes', () => {
    render(<KanjiWatermark kanji="海" className="custom-watermark" />);
    const glyph = screen.getByText('海');
    expect(glyph).toHaveClass('custom-watermark');
    expect(glyph).toHaveClass('right-[-24px]');
  });

  it('merges caller-supplied inline style without dropping size/opacity', () => {
    render(<KanjiWatermark kanji="風" size={120} opacity={0.1} style={{ color: 'red' }} />);
    const glyph = screen.getByText('風');
    expect(glyph).toHaveStyle({ fontSize: '120px', opacity: '0.1', color: 'rgb(255, 0, 0)' });
  });

  it('renders multi-character strings as the watermark content', () => {
    render(<KanjiWatermark kanji="物語" />);
    expect(screen.getByText('物語')).toBeInTheDocument();
  });
});
