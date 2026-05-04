/**
 * A bounded LRU cache with per-entry TTL.
 *
 * Entries are evicted in least-recently-used order once the cap is reached.
 * Expired entries are lazily dropped on access; no background timer is needed.
 */
export class LruTtlCache<K, V> {
  private readonly cap: number;
  private readonly defaultTtlMs: number;
  // Insertion-order Map — most-recently-used is last
  private readonly store = new Map<K, { value: V; expiresAt: number }>();

  constructor(cap = 200, defaultTtlMs = 5 * 60 * 1000) {
    this.cap = cap;
    this.defaultTtlMs = defaultTtlMs;
  }

  get(key: K): V | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    // Refresh LRU position
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  set(key: K, value: V, ttlMs: number = this.defaultTtlMs): void {
    // Remove before re-inserting so the key moves to the end (MRU position)
    this.store.delete(key);
    if (this.store.size >= this.cap) {
      // Evict the LRU entry (first key in insertion order)
      const lruKey = this.store.keys().next().value;
      if (lruKey !== undefined) this.store.delete(lruKey);
    }
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  delete(key: K): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }
}
