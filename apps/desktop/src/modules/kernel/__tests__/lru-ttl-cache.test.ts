import { LruTtlCache } from '../lru-ttl-cache';

describe('LruTtlCache', () => {
  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('basic operations', () => {
    it('stores and retrieves a value', () => {
      const cache = new LruTtlCache<string, number>(3, 60_000);
      cache.set('a', 1);
      expect(cache.get('a')).toBe(1);
    });

    it('returns undefined for a missing key', () => {
      const cache = new LruTtlCache<string, number>(3, 60_000);
      expect(cache.get('missing')).toBeUndefined();
    });

    it('delete removes the entry', () => {
      const cache = new LruTtlCache<string, number>(3, 60_000);
      cache.set('a', 1);
      cache.delete('a');
      expect(cache.get('a')).toBeUndefined();
      expect(cache.size).toBe(0);
    });

    it('clear removes all entries', () => {
      const cache = new LruTtlCache<string, number>(3, 60_000);
      cache.set('a', 1);
      cache.set('b', 2);
      cache.clear();
      expect(cache.size).toBe(0);
      expect(cache.get('a')).toBeUndefined();
      expect(cache.get('b')).toBeUndefined();
    });

    it('size reflects the number of live entries', () => {
      const cache = new LruTtlCache<string, number>(5, 60_000);
      expect(cache.size).toBe(0);
      cache.set('a', 1);
      cache.set('b', 2);
      expect(cache.size).toBe(2);
    });
  });

  describe('TTL expiry', () => {
    it('returns undefined after TTL has elapsed', () => {
      const cache = new LruTtlCache<string, string>(5, 1_000);
      cache.set('key', 'value', 1_000);
      expect(cache.get('key')).toBe('value');

      jest.advanceTimersByTime(1_001);
      expect(cache.get('key')).toBeUndefined();
    });

    it('expired entry is not counted in size after access', () => {
      const cache = new LruTtlCache<string, string>(5, 1_000);
      cache.set('key', 'value', 1_000);
      expect(cache.size).toBe(1);

      jest.advanceTimersByTime(1_001);
      // size is lazy — the entry still occupies the store until accessed
      cache.get('key'); // triggers lazy deletion
      expect(cache.size).toBe(0);
    });

    it('still-valid entries survive while expired ones are dropped on access', () => {
      const cache = new LruTtlCache<string, number>(5, 60_000);
      cache.set('short', 1, 500);
      cache.set('long', 2, 10_000);

      jest.advanceTimersByTime(600);
      expect(cache.get('short')).toBeUndefined();
      expect(cache.get('long')).toBe(2);
    });

    it('per-call TTL override takes precedence over default', () => {
      const cache = new LruTtlCache<string, number>(5, 60_000);
      cache.set('a', 1, 100);

      jest.advanceTimersByTime(101);
      expect(cache.get('a')).toBeUndefined();
    });
  });

  describe('LRU eviction at cap', () => {
    it('evicts the least-recently-used entry when cap is reached', () => {
      const cache = new LruTtlCache<string, number>(3, 60_000);
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);
      // Order (LRU → MRU): a, b, c — 'a' is oldest

      cache.set('d', 4); // cap exceeded; 'a' should be evicted
      expect(cache.get('a')).toBeUndefined();
      expect(cache.get('b')).toBe(2);
      expect(cache.get('c')).toBe(3);
      expect(cache.get('d')).toBe(4);
      expect(cache.size).toBe(3);
    });

    it('get() promotes accessed entry so it is not the next eviction victim', () => {
      const cache = new LruTtlCache<string, number>(3, 60_000);
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);
      // LRU → MRU: a, b, c

      // Touch 'a' — promotes it to MRU; new order: b, c, a
      expect(cache.get('a')).toBe(1);

      // Adding 'd' should evict 'b' (now the oldest), not 'a'
      cache.set('d', 4);
      expect(cache.get('b')).toBeUndefined();
      expect(cache.get('a')).toBe(1);
      expect(cache.get('c')).toBe(3);
      expect(cache.get('d')).toBe(4);
    });

    it('set() on an existing key moves it to MRU and does not evict extra entries', () => {
      const cache = new LruTtlCache<string, number>(3, 60_000);
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);
      // LRU → MRU: a, b, c

      // Re-set 'a' with a new value — it should move to MRU; order: b, c, a
      cache.set('a', 99);
      expect(cache.size).toBe(3); // no eviction — still within cap

      // Adding 'd' now evicts 'b' (oldest)
      cache.set('d', 4);
      expect(cache.get('b')).toBeUndefined();
      expect(cache.get('a')).toBe(99);
      expect(cache.get('c')).toBe(3);
      expect(cache.get('d')).toBe(4);
    });

    it('evicts second-oldest when oldest was recently accessed', () => {
      const cache = new LruTtlCache<string, number>(3, 60_000);
      cache.set('first', 1);
      cache.set('second', 2);
      cache.set('third', 3);
      // Order: first, second, third

      // Promote 'first' to MRU; new order: second, third, first
      cache.get('first');

      // Overflow — 'second' should be evicted (oldest after the promotion)
      cache.set('fourth', 4);
      expect(cache.get('second')).toBeUndefined();
      expect(cache.get('first')).toBe(1);
      expect(cache.get('third')).toBe(3);
      expect(cache.get('fourth')).toBe(4);
    });
  });
});
