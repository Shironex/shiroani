import { describe, expect, it } from 'vitest';
import { confirmKeywordMatches } from '@/lib/confirm-keyword';

describe('confirmKeywordMatches', () => {
  it('matches the exact keyword', () => {
    expect(confirmKeywordMatches('USUŃ', 'USUŃ')).toBe(true);
    expect(confirmKeywordMatches('DELETE', 'DELETE')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(confirmKeywordMatches('usuń', 'USUŃ')).toBe(true);
    expect(confirmKeywordMatches('delete', 'DELETE')).toBe(true);
    expect(confirmKeywordMatches('DeLeTe', 'DELETE')).toBe(true);
  });

  it('is diacritic-insensitive (USUN passes for USUŃ on a non-Polish keyboard)', () => {
    expect(confirmKeywordMatches('USUN', 'USUŃ')).toBe(true);
    expect(confirmKeywordMatches('usun', 'USUŃ')).toBe(true);
  });

  it('ignores leading/trailing whitespace', () => {
    expect(confirmKeywordMatches('  USUŃ  ', 'USUŃ')).toBe(true);
    expect(confirmKeywordMatches('\tdelete\n', 'DELETE')).toBe(true);
  });

  it('rejects a wrong word', () => {
    expect(confirmKeywordMatches('nope', 'USUŃ')).toBe(false);
    expect(confirmKeywordMatches('', 'DELETE')).toBe(false);
    expect(confirmKeywordMatches('delet', 'DELETE')).toBe(false);
  });

  it('does not match on internal whitespace differences', () => {
    expect(confirmKeywordMatches('US UN', 'USUŃ')).toBe(false);
  });
});
