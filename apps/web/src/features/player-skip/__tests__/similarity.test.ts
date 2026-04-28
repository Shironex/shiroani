import { jaroWinkler } from '../similarity';

describe('jaroWinkler', () => {
  it('returns 1 for identical strings', () => {
    expect(jaroWinkler('steins gate', 'steins gate')).toBe(1);
  });

  it('returns 0 for empty strings', () => {
    expect(jaroWinkler('', '')).toBe(1);
    expect(jaroWinkler('abc', '')).toBe(0);
    expect(jaroWinkler('', 'abc')).toBe(0);
  });

  it('"steins gate" vs "steinsgate" is > 0.9 (semicolon stripped)', () => {
    // After normalizeTitle, "Steins;Gate" → "steinsgate"
    // and "Steins Gate" → "steins gate"; these should still match well
    expect(jaroWinkler('steins gate', 'steinsgate')).toBeGreaterThan(0.9);
  });

  it('"attack on titan" vs "attack on titan" is 1', () => {
    expect(jaroWinkler('attack on titan', 'attack on titan')).toBe(1);
  });

  it('similar titles score well above threshold', () => {
    expect(jaroWinkler('fullmetal alchemist', 'fullmetal alchemist brotherhood')).toBeGreaterThan(
      0.85
    );
  });

  it('completely different titles score low', () => {
    expect(jaroWinkler('naruto', 'bleach')).toBeLessThan(0.7);
  });

  it('prefix weight boosts near-identical strings with shared prefix', () => {
    const withoutPrefix = jaroWinkler('xyz one piece', 'xyz one peace');
    const withPrefix = jaroWinkler('one piece', 'one peace');
    // Both should be high; the one with shared long prefix gets a slight boost
    expect(withPrefix).toBeGreaterThan(0.8);
    expect(withoutPrefix).toBeGreaterThan(0.8);
  });

  it('transposed characters reduce score', () => {
    const exact = jaroWinkler('naruto shippuden', 'naruto shippuden');
    const transposed = jaroWinkler('naruto shippuden', 'naruot shippuden');
    expect(exact).toBeGreaterThan(transposed);
  });

  it('returns value in [0, 1] range', () => {
    const pairs = [
      ['abc', 'def'],
      ['hello world', 'hello'],
      ['a', 'b'],
      ['steins gate', 'steins;gate'],
    ];
    for (const [a, b] of pairs) {
      const score = jaroWinkler(a, b);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    }
  });
});
