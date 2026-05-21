import { describe, it, expect } from 'vitest';
import type { LogEntry } from '@shiroani/shared';
import {
  isValidLevel,
  stringifyData,
  prettyPrintData,
  formatLine,
  parseJsonlLogEntries,
  matchesFilter,
  formatFileDate,
  formatDownloadStamp,
  describeError,
} from '../dev-logs-utils';

function makeEntry(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    timestamp: '2026-05-21T13:45:09.123Z',
    level: 'info',
    context: 'SessionService',
    message: 'session started',
    ...overrides,
  };
}

// A minimal TFunction stand-in: echoes the key so we can assert which key was used.
const tEcho = ((key: string) => key) as unknown as Parameters<typeof describeError>[1];

describe('isValidLevel', () => {
  it.each([
    ['error', true],
    ['warn', true],
    ['info', true],
    ['debug', true],
    ['fatal', false],
    ['trace', false],
    ['', false],
    ['INFO', false],
  ] as const)('isValidLevel(%j) -> %s', (input, expected) => {
    expect(isValidLevel(input)).toBe(expected);
  });
});

describe('stringifyData', () => {
  it('returns strings verbatim', () => {
    expect(stringifyData('already a string')).toBe('already a string');
  });
  it('JSON-stringifies plain objects', () => {
    expect(stringifyData({ a: 1, b: 'x' })).toBe('{"a":1,"b":"x"}');
  });
  it('JSON-stringifies arrays', () => {
    expect(stringifyData([1, 2, 3])).toBe('[1,2,3]');
  });
  it('falls back to String() on circular structures', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(stringifyData(circular)).toBe('[object Object]');
  });
});

describe('prettyPrintData', () => {
  it('pretty-prints a JSON string', () => {
    expect(prettyPrintData('{"a":1}')).toBe('{\n  "a": 1\n}');
  });
  it('returns a non-JSON string unchanged', () => {
    expect(prettyPrintData('plain text')).toBe('plain text');
  });
  it('pretty-prints a plain object', () => {
    expect(prettyPrintData({ a: 1 })).toBe('{\n  "a": 1\n}');
  });
  it('falls back to String() on circular structures', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(prettyPrintData(circular)).toBe('[object Object]');
  });
});

describe('formatLine', () => {
  it('formats time + padded level + context + message', () => {
    expect(formatLine(makeEntry())).toBe('13:45:09.123 INFO  [SessionService] session started');
  });
  it('appends stringified data when present', () => {
    expect(formatLine(makeEntry({ level: 'error', data: { code: 42 } }))).toBe(
      '13:45:09.123 ERROR [SessionService] session started {"code":42}'
    );
  });
  it('does not append anything when data is undefined', () => {
    expect(formatLine(makeEntry({ data: undefined }))).not.toContain('undefined');
  });
  it('falls back to the raw timestamp when it has no time component', () => {
    expect(formatLine(makeEntry({ timestamp: 'no-time-here' }))).toBe(
      'no-time-here INFO  [SessionService] session started'
    );
  });
});

describe('parseJsonlLogEntries', () => {
  it('parses valid JSONL lines', () => {
    const jsonl = [
      JSON.stringify(makeEntry({ message: 'one' })),
      JSON.stringify(makeEntry({ message: 'two', level: 'warn' })),
    ].join('\n');
    const parsed = parseJsonlLogEntries(jsonl);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].message).toBe('one');
    expect(parsed[1].level).toBe('warn');
  });
  it('skips blank lines and tolerates CRLF', () => {
    const jsonl = `${JSON.stringify(makeEntry())}\r\n\r\n${JSON.stringify(makeEntry())}\r\n`;
    expect(parseJsonlLogEntries(jsonl)).toHaveLength(2);
  });
  it('skips malformed JSON lines', () => {
    const jsonl = `not json\n${JSON.stringify(makeEntry())}\n{broken`;
    expect(parseJsonlLogEntries(jsonl)).toHaveLength(1);
  });
  it('skips well-formed JSON missing required fields', () => {
    const jsonl = [
      JSON.stringify({ timestamp: 'x', level: 'info', context: 'c' }), // no message
      JSON.stringify({ timestamp: 'x', level: 'nope', context: 'c', message: 'm' }), // bad level
      JSON.stringify(makeEntry()), // valid
    ].join('\n');
    expect(parseJsonlLogEntries(jsonl)).toHaveLength(1);
  });
  it('returns an empty array for empty input', () => {
    expect(parseJsonlLogEntries('')).toEqual([]);
  });
});

describe('matchesFilter', () => {
  it('passes everything when level is "all" and query is empty', () => {
    expect(matchesFilter(makeEntry(), 'all', '')).toBe(true);
  });
  it('filters by level', () => {
    expect(matchesFilter(makeEntry({ level: 'error' }), 'error', '')).toBe(true);
    expect(matchesFilter(makeEntry({ level: 'info' }), 'error', '')).toBe(false);
  });
  it('matches against the message (case-insensitive)', () => {
    expect(matchesFilter(makeEntry({ message: 'Session STARTED' }), 'all', 'started')).toBe(true);
  });
  it('matches against the context', () => {
    expect(matchesFilter(makeEntry({ context: 'BrowserManager' }), 'all', 'browser')).toBe(true);
  });
  it('matches against stringified data', () => {
    expect(matchesFilter(makeEntry({ data: { url: 'example.com' } }), 'all', 'example')).toBe(true);
  });
  it('returns false when neither level nor text matches', () => {
    expect(matchesFilter(makeEntry({ level: 'info', message: 'a' }), 'warn', 'zzz')).toBe(false);
  });
  it('combines level + text (both must pass)', () => {
    const e = makeEntry({ level: 'error', message: 'boom' });
    expect(matchesFilter(e, 'error', 'boom')).toBe(true);
    expect(matchesFilter(e, 'error', 'nomatch')).toBe(false);
    expect(matchesFilter(e, 'warn', 'boom')).toBe(false);
  });
});

describe('formatFileDate', () => {
  it('formats a valid epoch ms as yyyy-mm-dd hh:mi', () => {
    const ts = new Date(2026, 4, 21, 13, 45).getTime(); // local time, month is 0-based
    expect(formatFileDate(ts)).toBe('2026-05-21 13:45');
  });
  it('zero-pads single-digit components', () => {
    const ts = new Date(2026, 0, 3, 4, 9).getTime();
    expect(formatFileDate(ts)).toBe('2026-01-03 04:09');
  });
  it('returns the em-dash sentinel for NaN', () => {
    expect(formatFileDate(NaN)).toBe('—');
  });
});

describe('formatDownloadStamp', () => {
  it('formats a Date as yyyy-mm-dd-hhmi (no separators in time)', () => {
    expect(formatDownloadStamp(new Date(2026, 4, 21, 13, 45))).toBe('2026-05-21-1345');
  });
  it('zero-pads single-digit components', () => {
    expect(formatDownloadStamp(new Date(2026, 0, 3, 4, 9))).toBe('2026-01-03-0409');
  });
});

describe('describeError', () => {
  it('uses the message of an Error', () => {
    expect(describeError(new Error('disk full'), tEcho)).toBe('disk full');
  });
  it('falls back to the unknownError key for an empty Error message', () => {
    expect(describeError(new Error(''), tEcho)).toBe('logs.unknownError');
  });
  it('passes through string errors verbatim', () => {
    expect(describeError('plain failure', tEcho)).toBe('plain failure');
  });
  it('falls back to the fileError key for other shapes', () => {
    expect(describeError({ weird: true }, tEcho)).toBe('logs.fileError');
    expect(describeError(null, tEcho)).toBe('logs.fileError');
  });
});
