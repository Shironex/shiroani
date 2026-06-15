import { describe, expect, it } from 'vitest';
import { readableTextColor } from './color-utils';

describe('readableTextColor', () => {
  it('returns white text for dark backgrounds', () => {
    expect(readableTextColor('#000000')).toBe('#ffffff');
    expect(readableTextColor('#1d4999')).toBe('#ffffff'); // deep blue (ANN-style)
  });

  it('returns black text for light/bright backgrounds', () => {
    expect(readableTextColor('#ffffff')).toBe('#000000');
    expect(readableTextColor('#f47521')).toBe('#000000'); // Crunchyroll orange
  });

  it('accepts shorthand 3-digit hex', () => {
    expect(readableTextColor('#fff')).toBe('#000000');
    expect(readableTextColor('#000')).toBe('#ffffff');
  });

  it('picks the higher-contrast option around the luminance threshold', () => {
    // Mid grays straddle the ~0.179 relative-luminance cutoff.
    expect(readableTextColor('#808080')).toBe('#000000');
    expect(readableTextColor('#595959')).toBe('#ffffff');
  });
});
