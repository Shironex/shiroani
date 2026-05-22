import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { formatMB, formatRelativeTime } from '../update-format';

describe('formatMB', () => {
  it('formats positive byte counts as MB with one decimal', () => {
    expect(formatMB(1024 * 1024, 'en')).toBe('1.0 MB');
    expect(formatMB(1.5 * 1024 * 1024, 'en')).toBe('1.5 MB');
    expect(formatMB(157 * 1024 * 1024, 'en')).toBe('157.0 MB');
  });

  it('clamps non-finite and non-positive inputs to 0', () => {
    expect(formatMB(0, 'en')).toBe('0.0 MB');
    expect(formatMB(-500, 'en')).toBe('0.0 MB');
    expect(formatMB(Number.NaN, 'en')).toBe('0.0 MB');
    expect(formatMB(Number.POSITIVE_INFINITY, 'en')).toBe('0.0 MB');
  });
});

describe('formatRelativeTime', () => {
  const NOW = new Date('2026-05-22T12:00:00.000Z').getTime();
  const justNow = 'teraz';
  const today = (time: string) => `dzisiaj ${time}`;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns null when there is no timestamp', () => {
    expect(formatRelativeTime(null, 'en', justNow, today)).toBeNull();
  });

  it('does not treat epoch 0 as a missing timestamp', () => {
    expect(formatRelativeTime(0, 'en', justNow, today)).not.toBeNull();
  });

  it('returns null for future timestamps', () => {
    expect(formatRelativeTime(NOW + 60_000, 'en', justNow, today)).toBeNull();
  });

  it('returns the just-now label for events under a minute old', () => {
    expect(formatRelativeTime(NOW - 5_000, 'en', justNow, today)).toBe(justNow);
    expect(formatRelativeTime(NOW - 45_000, 'en', justNow, today)).toBe(justNow);
  });

  it('formats minutes and hours relatively within ~6 hours', () => {
    expect(formatRelativeTime(NOW - 10 * 60_000, 'en', justNow, today)).toContain('10');
    expect(formatRelativeTime(NOW - 3 * 60 * 60_000, 'en', justNow, today)).toContain('3');
  });

  it('falls back to a today-prefixed clock for same-day events older than ~6h', () => {
    const result = formatRelativeTime(NOW - 7 * 60 * 60_000, 'en', justNow, today);
    expect(result).toMatch(/^dzisiaj /);
  });
});
