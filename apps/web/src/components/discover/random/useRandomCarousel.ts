import { useCallback, useEffect, useState } from 'react';
import { useDiscoverStore, type DiscoverMedia } from '@/stores/useDiscoverStore';
import { isEditableTarget } from '@/lib/is-editable-target';

export interface RandomCarousel {
  index: number;
  current: DiscoverMedia | undefined;
  peekPrev: DiscoverMedia | null;
  peekNext: DiscoverMedia | null;
  prev: () => void;
  next: () => void;
}

/**
 * Carousel state for the random discovery pool:
 * - tracks the current index
 * - resets to 0 whenever the pool reference changes (e.g. reshuffle / refetch)
 * - `next` wraps via reshuffle (so users keep getting fresh orders past pool end)
 * - `prev` wraps modulo pool length (cheap browse-back)
 * - binds ArrowLeft/ArrowRight globally, ignoring inputs/textareas
 */
export function useRandomCarousel(pool: DiscoverMedia[]): RandomCarousel {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [pool]);

  const prev = useCallback(() => {
    setIndex(i => (pool.length === 0 ? 0 : (i - 1 + pool.length) % pool.length));
  }, [pool.length]);

  const next = useCallback(() => {
    setIndex(i => {
      if (pool.length === 0) return 0;
      const n = i + 1;
      if (n >= pool.length) {
        useDiscoverStore.getState().reshuffleRandom();
        return 0;
      }
      return n;
    });
  }, [pool.length]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [prev, next]);

  const current = pool[index];
  const peekPrev = pool.length > 1 ? pool[(index - 1 + pool.length) % pool.length] : null;
  const peekNext = pool.length > 1 ? pool[(index + 1) % pool.length] : null;

  return { index, current, peekPrev, peekNext, prev, next };
}
