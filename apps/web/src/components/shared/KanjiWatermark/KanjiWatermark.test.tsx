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
});
