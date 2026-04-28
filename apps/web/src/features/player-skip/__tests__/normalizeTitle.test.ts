import { normalizeTitle } from '../normalizeTitle';

describe('normalizeTitle', () => {
  it('lowercases ASCII titles', () => {
    expect(normalizeTitle('Attack on Titan')).toBe('attack on titan');
  });

  it('replaces hyphens with spaces', () => {
    expect(normalizeTitle('tsue-to-tsurugi-no-wistoria-2')).toBe('tsue to tsurugi no wistoria 2');
  });

  it('strips semicolons and non-alphanumeric characters', () => {
    expect(normalizeTitle('Steins;Gate')).toBe('steinsgate');
  });

  it('strips punctuation, collapses spaces from compound titles', () => {
    // "Re:Zero − Starting Life..." — colon stripped, em-dash stripped, spaces collapsed
    expect(normalizeTitle('Re:Zero Starting Life in Another World')).toBe(
      'rezero starting life in another world'
    );
  });

  it('collapses multiple spaces into one', () => {
    expect(normalizeTitle('Sword  Art   Online')).toBe('sword art online');
  });

  it('trims leading and trailing whitespace', () => {
    expect(normalizeTitle('  Naruto  ')).toBe('naruto');
  });

  it('handles trailing season numbers', () => {
    expect(normalizeTitle('Overlord IV')).toBe('overlord iv');
  });

  it('handles empty string', () => {
    expect(normalizeTitle('')).toBe('');
  });

  it('strips dots and colons', () => {
    expect(normalizeTitle('No Game, No Life: Zero')).toBe('no game no life zero');
  });

  it('keeps numeric characters and converts hyphen-separated numbers to spaces', () => {
    expect(normalizeTitle('86 EIGHTY-SIX')).toBe('86 eighty six');
  });
});
