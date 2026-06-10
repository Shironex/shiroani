import { describe, it, expect } from 'vitest';
import { extractErrorMessage, toLocalDate, getWeekStart, normalizeAnimeTitle } from '../utils';

describe('extractErrorMessage', () => {
  it('returns message from an Error instance', () => {
    expect(extractErrorMessage(new Error('boom'))).toBe('boom');
  });

  it('returns message from a TypeError', () => {
    expect(extractErrorMessage(new TypeError('type issue'))).toBe('type issue');
  });

  it('stringifies a plain string when no fallback is given', () => {
    expect(extractErrorMessage('oops')).toBe('oops');
  });

  it('stringifies an object with a message property (not an Error)', () => {
    expect(extractErrorMessage({ message: 'not an error' })).toBe('[object Object]');
  });

  it('uses the fallback when provided and error is not an Error', () => {
    expect(extractErrorMessage({ message: 'not an error' }, 'fallback')).toBe('fallback');
  });

  it('handles null', () => {
    expect(extractErrorMessage(null)).toBe('null');
  });

  it('handles undefined', () => {
    expect(extractErrorMessage(undefined)).toBe('undefined');
  });

  it('handles a number', () => {
    expect(extractErrorMessage(42)).toBe('42');
  });

  it('prefers Error.message over fallback', () => {
    expect(extractErrorMessage(new Error('real'), 'fallback')).toBe('real');
  });
});

describe('toLocalDate', () => {
  it('formats a known date correctly', () => {
    const d = new Date(2024, 0, 15); // Jan 15, 2024
    expect(toLocalDate(d)).toBe('2024-01-15');
  });

  it('zero-pads single-digit months', () => {
    const d = new Date(2024, 2, 5); // Mar 5
    expect(toLocalDate(d)).toBe('2024-03-05');
  });

  it('zero-pads single-digit days', () => {
    const d = new Date(2024, 11, 3); // Dec 3
    expect(toLocalDate(d)).toBe('2024-12-03');
  });

  it('handles midnight correctly', () => {
    const d = new Date(2024, 5, 1, 0, 0, 0, 0); // Jun 1 midnight
    expect(toLocalDate(d)).toBe('2024-06-01');
  });

  it('handles end of year', () => {
    const d = new Date(2024, 11, 31); // Dec 31
    expect(toLocalDate(d)).toBe('2024-12-31');
  });

  it('handles double-digit month and day', () => {
    const d = new Date(2024, 10, 22); // Nov 22
    expect(toLocalDate(d)).toBe('2024-11-22');
  });
});

describe('getWeekStart', () => {
  it('returns the same day for a Monday', () => {
    // 2024-01-08 is a Monday
    const monday = new Date(2024, 0, 8, 12, 30);
    const result = getWeekStart(monday);
    expect(result.getFullYear()).toBe(2024);
    expect(result.getMonth()).toBe(0);
    expect(result.getDate()).toBe(8);
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
  });

  it('returns the previous Monday for a Wednesday', () => {
    // 2024-01-10 is a Wednesday
    const wed = new Date(2024, 0, 10, 15, 0);
    const result = getWeekStart(wed);
    expect(result.getDate()).toBe(8); // Monday Jan 8
  });

  it('returns the previous Monday for a Sunday', () => {
    // 2024-01-14 is a Sunday
    const sun = new Date(2024, 0, 14, 10, 0);
    const result = getWeekStart(sun);
    expect(result.getDate()).toBe(8); // Monday Jan 8
  });

  it('returns the previous Monday for a Saturday', () => {
    // 2024-01-13 is a Saturday
    const sat = new Date(2024, 0, 13);
    const result = getWeekStart(sat);
    expect(result.getDate()).toBe(8);
  });

  it('sets time to midnight', () => {
    const d = new Date(2024, 0, 10, 18, 45, 30, 500);
    const result = getWeekStart(d);
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
    expect(result.getMilliseconds()).toBe(0);
  });

  it('does not mutate the original date', () => {
    const original = new Date(2024, 0, 10, 15, 0);
    const originalTime = original.getTime();
    getWeekStart(original);
    expect(original.getTime()).toBe(originalTime);
  });

  it('returns a Monday for current week when called with no argument', () => {
    const result = getWeekStart();
    expect(result.getDay()).toBe(1); // Monday
    expect(result.getHours()).toBe(0);
  });
});

describe('normalizeAnimeTitle', () => {
  it('matches case/punctuation variants of the same title', () => {
    expect(normalizeAnimeTitle('Attack On Titan')).toBe(normalizeAnimeTitle('attack-on-titan'));
    expect(normalizeAnimeTitle('Re:Zero — Starting Life')).toBe(
      normalizeAnimeTitle('re zero starting life')
    );
  });

  it('strips diacritics so "Pokémon" matches "Pokemon"', () => {
    expect(normalizeAnimeTitle('Pokémon')).toBe(normalizeAnimeTitle('Pokemon'));
  });

  it('preserves CJK titles instead of normalizing them to the empty string', () => {
    const norm = normalizeAnimeTitle('進撃の巨人');
    expect(norm.length).toBeGreaterThan(0);
    expect(normalizeAnimeTitle('葬送のフリーレン')).not.toBe(norm);
  });

  it('collapses whitespace runs and trims', () => {
    expect(normalizeAnimeTitle('  One   Piece  ')).toBe('one piece');
  });
});
