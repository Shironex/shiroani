/**
 * Tracks running backend calls so shutdown can wait briefly for them before the
 * database closes. Waiting is bounded: a long sync must not hold up quitting.
 */
export class InflightTracker {
  private readonly pending = new Set<Promise<unknown>>();

  get size(): number {
    return this.pending.size;
  }

  track<T>(promise: Promise<T>): Promise<T> {
    const settled = promise.then(
      () => undefined,
      () => undefined
    );
    this.pending.add(settled);
    void settled.then(() => this.pending.delete(settled));
    return promise;
  }

  /** Resolve when everything tracked now has settled, or after `timeoutMs`. */
  async drain(timeoutMs: number): Promise<void> {
    if (this.pending.size === 0) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<void>(resolve => {
      timer = setTimeout(resolve, timeoutMs);
    });
    await Promise.race([Promise.all(this.pending), timeout]);
    clearTimeout(timer);
  }
}
