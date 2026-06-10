import { describe, expect, it } from 'vitest';
import { redactForLogs } from '../logger';
import { LOG_REDACT_PLACEHOLDER } from '../constants';

describe('redactForLogs — Error handling', () => {
  it('converts an Error into a JSON-serializable string carrying message + stack', () => {
    const err = new Error('boom at /Users/shirone/Documents/app.ts');
    const out = redactForLogs(err);
    // JSON.stringify(new Error()) is '{}' — the file transport must never see
    // a bare Error or every logged failure loses its message and stack.
    expect(typeof out).toBe('string');
    expect(JSON.stringify({ data: out })).toContain('boom');
  });

  it('scrubs home-directory paths inside Error stacks', () => {
    const err = new Error('ENOENT: /Users/shirone/Library/Logs/app.log');
    const out = redactForLogs(err) as unknown as string;
    expect(out).not.toContain('shirone');
    expect(out).toContain('/Users/<USER>/');
  });

  it('converts Errors nested inside objects and arrays', () => {
    const out = redactForLogs({ wrapped: new Error('nested failure') });
    expect(typeof out.wrapped).toBe('string');
    expect(out.wrapped as unknown as string).toContain('nested failure');
    expect(JSON.stringify(out)).toContain('nested failure');
  });
});

describe('redactForLogs — URL query strings', () => {
  it('redacts the query of a whole-string URL', () => {
    const out = redactForLogs('https://cdn.example.com/img.jpg?sig=secret123');
    expect(out).not.toContain('secret123');
    expect(out).toContain(LOG_REDACT_PLACEHOLDER);
  });

  it('redacts the query of a URL embedded mid-message', () => {
    const out = redactForLogs(
      'Failed to fetch image: https://cdn.example.com/i.jpg?sig=tok123 (status 403)'
    );
    expect(out).not.toContain('tok123');
    expect(out).toContain(LOG_REDACT_PLACEHOLDER);
    expect(out).toContain('(status 403)');
  });
});

describe('redactForLogs — home-directory paths', () => {
  it('scrubs a path with a trailing separator', () => {
    const out = redactForLogs('read /Users/shirone/Documents/file.txt failed');
    expect(out).not.toContain('shirone');
  });

  it('scrubs a path that ends at end-of-string (no trailing separator)', () => {
    const out = redactForLogs('ENOENT: no such directory /Users/shirone');
    expect(out).not.toContain('shirone');
  });

  it('scrubs Windows-style user paths', () => {
    const out = redactForLogs('EPERM: C:\\Users\\shirone\\AppData\\app.log');
    expect(out).not.toContain('shirone');
  });
});

describe('redactForLogs — deny-listed keys (existing contract)', () => {
  it('masks token-like keys', () => {
    const out = redactForLogs({ accessToken: 'abc123', plain: 'keep' });
    expect(out.accessToken).toBe(LOG_REDACT_PLACEHOLDER);
    expect(out.plain).toBe('keep');
  });
});
