import { useEffect, useState } from 'react';

/**
 * Returns the current epoch in **seconds**, re-rendering on a fixed cadence.
 *
 * Subscribers sharing the same cadence share a single underlying `setInterval`
 * via a module-level registry — important for views like Library that render
 * many CountdownBadges at once. The interval is created when the first
 * subscriber for a given `intervalMs` mounts and torn down when the last
 * unmounts.
 */

interface CadenceEntry {
  intervalId: number;
  subscribers: Set<(now: number) => void>;
}

const registry = new Map<number, CadenceEntry>();

function subscribe(intervalMs: number, listener: (now: number) => void): () => void {
  let entry = registry.get(intervalMs);
  if (!entry) {
    const subscribers = new Set<(now: number) => void>();
    const intervalId = window.setInterval(() => {
      const next = Math.floor(Date.now() / 1000);
      for (const fn of subscribers) fn(next);
    }, intervalMs);
    entry = { intervalId, subscribers };
    registry.set(intervalMs, entry);
  }
  entry.subscribers.add(listener);

  return () => {
    const current = registry.get(intervalMs);
    if (!current) return;
    current.subscribers.delete(listener);
    if (current.subscribers.size === 0) {
      window.clearInterval(current.intervalId);
      registry.delete(intervalMs);
    }
  };
}

export function useNowSeconds(intervalMs: number): number {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => subscribe(intervalMs, setNow), [intervalMs]);

  return now;
}
