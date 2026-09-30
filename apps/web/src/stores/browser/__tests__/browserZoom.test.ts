import { describe, it, expect } from 'vitest';
import {
  BROWSER_ZOOM_MAX_ENTRIES,
  createZoomLevels,
  DEFAULT_ZOOM_PERCENT,
  MAX_ZOOM_PERCENT,
  MIN_ZOOM_PERCENT,
  migratePersistedZoomLevels,
  nextZoomStep,
  sanitizeZoomPercent,
  setZoomEntry,
  zoomDirectionForKey,
  zoomHostKey,
  zoomPercentForHost,
  zoomPercentForUrl,
} from '../browserZoom';

/**
 * Hostnames that collide with Object.prototype members. Web content controls
 * the host (a link to `http://__proto__/`), so none may resolve to an
 * inherited value.
 */
const PROTOTYPE_HOSTS = ['__proto__', 'constructor', 'tostring', 'hasownproperty', 'valueof'];

describe('nextZoomStep', () => {
  it('steps along the desktop-browser ladder', () => {
    expect(nextZoomStep(100, 'in')).toBe(110);
    expect(nextZoomStep(110, 'in')).toBe(125);
    expect(nextZoomStep(100, 'out')).toBe(90);
    expect(nextZoomStep(90, 'out')).toBe(80);
  });

  it('snaps an off-ladder value to the neighbouring step', () => {
    expect(nextZoomStep(115, 'in')).toBe(125);
    expect(nextZoomStep(115, 'out')).toBe(110);
  });

  it('clamps at both ends of the ladder', () => {
    expect(nextZoomStep(MAX_ZOOM_PERCENT, 'in')).toBe(MAX_ZOOM_PERCENT);
    expect(nextZoomStep(MIN_ZOOM_PERCENT, 'out')).toBe(MIN_ZOOM_PERCENT);
    expect(MIN_ZOOM_PERCENT).toBe(25);
    expect(MAX_ZOOM_PERCENT).toBe(500);
  });

  it('resets to 100% from anywhere', () => {
    expect(nextZoomStep(250, 'reset')).toBe(DEFAULT_ZOOM_PERCENT);
    expect(nextZoomStep(33, 'reset')).toBe(DEFAULT_ZOOM_PERCENT);
  });
});

describe('zoomDirectionForKey', () => {
  it('maps = and + to zoom in, - to zoom out and 0 to reset', () => {
    expect(zoomDirectionForKey('=')).toBe('in');
    expect(zoomDirectionForKey('+')).toBe('in');
    expect(zoomDirectionForKey('-')).toBe('out');
    expect(zoomDirectionForKey('0')).toBe('reset');
  });

  it('ignores every other key', () => {
    for (const key of ['w', '_', '9', 'Tab', 'ArrowLeft']) {
      expect(zoomDirectionForKey(key)).toBeNull();
    }
  });
});

describe('zoomHostKey', () => {
  it('keys http(s) pages by lowercased hostname, ignoring path, port and query', () => {
    expect(zoomHostKey('https://Shinden.PL/episode/1?x=1')).toBe('shinden.pl');
    expect(zoomHostKey('http://localhost:3000/a')).toBe('localhost');
  });

  it('keeps subdomains distinct, like a desktop browser', () => {
    expect(zoomHostKey('https://www.youtube.com/')).toBe('www.youtube.com');
    expect(zoomHostKey('https://m.youtube.com/')).toBe('m.youtube.com');
  });

  it('has no key for internal, non-http or unparsable URLs', () => {
    expect(zoomHostKey('shiroani://newtab')).toBeNull();
    expect(zoomHostKey('about:blank')).toBeNull();
    expect(zoomHostKey('file:///etc/hosts')).toBeNull();
    expect(zoomHostKey('not a url')).toBeNull();
    expect(zoomHostKey('')).toBeNull();
    expect(zoomHostKey(null)).toBeNull();
  });
});

describe('zoomPercentForUrl', () => {
  it('returns the remembered level for the URL host, else 100', () => {
    const levels = { 'shinden.pl': 125 };
    expect(zoomPercentForUrl(levels, 'https://shinden.pl/anime')).toBe(125);
    expect(zoomPercentForUrl(levels, 'https://youtube.com/')).toBe(100);
    expect(zoomPercentForUrl(levels, 'about:blank')).toBe(100);
  });
});

describe('setZoomEntry', () => {
  it('adds a host without mutating the input', () => {
    const before = { 'a.com': 110 };
    const after = setZoomEntry(before, 'b.com', 150);
    expect(after).toEqual({ 'a.com': 110, 'b.com': 150 });
    expect(before).toEqual({ 'a.com': 110 });
  });

  it('drops a host that is back at 100%', () => {
    expect(setZoomEntry({ 'a.com': 110, 'b.com': 150 }, 'a.com', 100)).toEqual({ 'b.com': 150 });
  });

  it('rejects an out-of-range level by removing the host', () => {
    expect(setZoomEntry({ 'a.com': 110 }, 'a.com', 900)).toEqual({});
    expect(setZoomEntry({ 'a.com': 110 }, 'a.com', Number.NaN)).toEqual({});
  });

  it('moves a changed host to the newest slot and evicts the oldest past the cap', () => {
    let levels = setZoomEntry({}, 'a.com', 110, 2);
    levels = setZoomEntry(levels, 'b.com', 125, 2);
    levels = setZoomEntry(levels, 'a.com', 150, 2); // a.com is now the newest
    levels = setZoomEntry(levels, 'c.com', 90, 2); // evicts b.com, the oldest
    expect(Object.keys(levels)).toEqual(['a.com', 'c.com']);
  });

  it('defaults to the store cap', () => {
    let levels = {};
    for (let i = 0; i < BROWSER_ZOOM_MAX_ENTRIES + 5; i++) {
      levels = setZoomEntry(levels, `site${i}.com`, 110);
    }
    expect(Object.keys(levels)).toHaveLength(BROWSER_ZOOM_MAX_ENTRIES);
    expect(levels).not.toHaveProperty('site0.com');
  });
});

describe('migratePersistedZoomLevels', () => {
  it('returns an empty map for non-object input', () => {
    expect(migratePersistedZoomLevels(undefined)).toEqual({});
    expect(migratePersistedZoomLevels(null)).toEqual({});
    expect(migratePersistedZoomLevels([['a.com', 110]])).toEqual({});
    expect(migratePersistedZoomLevels('a.com')).toEqual({});
  });

  it('keeps valid entries and drops 100%, out-of-range and non-numeric ones', () => {
    expect(
      migratePersistedZoomLevels({
        'a.com': 125,
        'b.com': 100,
        'c.com': 9000,
        'd.com': '150',
        'E.com': 80,
      })
    ).toEqual({ 'a.com': 125, 'e.com': 80 });
  });
});

describe('prototype-named hosts', () => {
  it('parses to the literal host names this suite relies on', () => {
    expect(zoomHostKey('http://__proto__/')).toBe('__proto__');
    expect(zoomHostKey('http://constructor/')).toBe('constructor');
    expect(zoomHostKey('http://toString/')).toBe('tostring');
    expect(zoomHostKey('http://hasOwnProperty/')).toBe('hasownproperty');
  });

  it.each(PROTOTYPE_HOSTS)('%s reads as 100%% from an empty map of either kind', host => {
    for (const levels of [createZoomLevels(), {}]) {
      expect(zoomPercentForHost(levels, host)).toBe(DEFAULT_ZOOM_PERCENT);
      expect(zoomPercentForUrl(levels, `http://${host}/`)).toBe(DEFAULT_ZOOM_PERCENT);
    }
    // Exact case too, for callers that pass a raw key.
    expect(zoomPercentForHost({}, 'toString')).toBe(DEFAULT_ZOOM_PERCENT);
    expect(zoomPercentForHost({}, 'hasOwnProperty')).toBe(DEFAULT_ZOOM_PERCENT);
  });

  it('ignores inherited entries and reads own entries only', () => {
    const levels = Object.create({ 'evil.com': 150 }) as Record<string, number>;
    expect(zoomPercentForHost(levels, 'evil.com')).toBe(DEFAULT_ZOOM_PERCENT);
    levels['evil.com'] = 125;
    expect(zoomPercentForHost(levels, 'evil.com')).toBe(125);
  });

  it.each(PROTOTYPE_HOSTS)('%s can be zoomed, read back and reset', host => {
    const zoomed = setZoomEntry(createZoomLevels(), host, 150);
    expect(Object.keys(zoomed)).toEqual([host]);
    expect(zoomPercentForHost(zoomed, host)).toBe(150);
    // Other prototype names stay at 100% next to it.
    for (const other of PROTOTYPE_HOSTS.filter(h => h !== host)) {
      expect(zoomPercentForHost(zoomed, other)).toBe(DEFAULT_ZOOM_PERCENT);
    }
    const reset = setZoomEntry(zoomed, host, DEFAULT_ZOOM_PERCENT);
    expect(Object.keys(reset)).toEqual([]);
    expect(zoomPercentForHost(reset, host)).toBe(DEFAULT_ZOOM_PERCENT);
  });

  it('builds maps with a null prototype, so no host inherits anything', () => {
    expect(Object.getPrototypeOf(createZoomLevels())).toBeNull();
    expect(Object.getPrototypeOf(setZoomEntry({}, 'a.com', 110))).toBeNull();
    expect(Object.getPrototypeOf(migratePersistedZoomLevels({ 'a.com': 110 }))).toBeNull();
    expect(Object.getPrototypeOf(migratePersistedZoomLevels(undefined))).toBeNull();
  });

  it('round-trips a __proto__ entry through JSON persistence', () => {
    const levels = setZoomEntry(setZoomEntry(createZoomLevels(), '__proto__', 150), 'a.com', 80);
    const json = JSON.stringify(levels);
    expect(json).toBe('{"__proto__":150,"a.com":80}');
    // JSON.parse creates "__proto__" as an own data property.
    const restored = migratePersistedZoomLevels(JSON.parse(json));
    expect(zoomPercentForHost(restored, '__proto__')).toBe(150);
    expect(zoomPercentForHost(restored, 'a.com')).toBe(80);
    expect(Object.getPrototypeOf(restored)).toBeNull();
  });

  it('never returns a non-number for a map holding junk under a prototype name', () => {
    const junk = JSON.parse('{"__proto__":{"x":1},"constructor":"big","tostring":null}');
    for (const host of ['__proto__', 'constructor', 'tostring']) {
      expect(zoomPercentForHost(junk, host)).toBe(DEFAULT_ZOOM_PERCENT);
    }
    expect(migratePersistedZoomLevels(junk)).toEqual({});
  });
});

describe('sanitizeZoomPercent', () => {
  it('passes a finite in-range percentage through', () => {
    expect(sanitizeZoomPercent(MIN_ZOOM_PERCENT)).toBe(MIN_ZOOM_PERCENT);
    expect(sanitizeZoomPercent(125)).toBe(125);
    expect(sanitizeZoomPercent(MAX_ZOOM_PERCENT)).toBe(MAX_ZOOM_PERCENT);
  });

  it('turns NaN, infinities, out-of-range and non-numbers into 100', () => {
    for (const value of [
      Number.NaN,
      Infinity,
      -Infinity,
      MIN_ZOOM_PERCENT - 1,
      MAX_ZOOM_PERCENT + 1,
      '150',
      null,
      undefined,
      Object.prototype,
      Object,
    ]) {
      expect(sanitizeZoomPercent(value)).toBe(DEFAULT_ZOOM_PERCENT);
    }
  });
});
