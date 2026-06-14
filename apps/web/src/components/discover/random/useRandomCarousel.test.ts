import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRandomCarousel } from '../useRandomCarousel';
import type { DiscoverMedia } from '@/stores/useDiscoverStore';

const reshuffleSpy = vi.fn();

vi.mock('@/stores/useDiscoverStore', () => ({
  useDiscoverStore: {
    getState: () => ({ reshuffleRandom: reshuffleSpy }),
  },
}));

function makePool(n: number): DiscoverMedia[] {
  return Array.from({ length: n }, (_, i) => ({
    id: i + 1,
    title: { english: `Anime ${i + 1}` },
    coverImage: { large: `cover-${i + 1}.jpg` },
  }));
}

beforeEach(() => {
  reshuffleSpy.mockClear();
});

afterEach(() => {
  // Cleanup window listeners between tests
  // (renderHook unmount handles this via the effect cleanup)
});

describe('useRandomCarousel', () => {
  it('starts at index 0 with the first item as current', () => {
    const pool = makePool(3);
    const { result } = renderHook(() => useRandomCarousel(pool));
    expect(result.current.index).toBe(0);
    expect(result.current.current?.id).toBe(1);
  });

  it('next() advances the index', () => {
    const pool = makePool(3);
    const { result } = renderHook(() => useRandomCarousel(pool));
    act(() => result.current.next());
    expect(result.current.index).toBe(1);
    expect(result.current.current?.id).toBe(2);
  });

  it('prev() wraps to the last item from index 0', () => {
    const pool = makePool(3);
    const { result } = renderHook(() => useRandomCarousel(pool));
    act(() => result.current.prev());
    expect(result.current.index).toBe(2);
    expect(result.current.current?.id).toBe(3);
  });

  it('next() at end wraps to 0 and triggers a reshuffle', () => {
    const pool = makePool(2);
    const { result } = renderHook(() => useRandomCarousel(pool));
    act(() => result.current.next()); // 0 -> 1
    act(() => result.current.next()); // 1 -> wrap, reshuffle
    expect(result.current.index).toBe(0);
    expect(reshuffleSpy).toHaveBeenCalledTimes(1);
  });

  it('peekPrev / peekNext show neighbours when pool has >1 item', () => {
    const pool = makePool(3);
    const { result } = renderHook(() => useRandomCarousel(pool));
    // At index 0: prev = last (3), next = item 2
    expect(result.current.peekPrev?.id).toBe(3);
    expect(result.current.peekNext?.id).toBe(2);
  });

  it('peeks are null when pool has 0 or 1 items', () => {
    const single = renderHook(() => useRandomCarousel(makePool(1)));
    expect(single.result.current.peekPrev).toBeNull();
    expect(single.result.current.peekNext).toBeNull();

    const empty = renderHook(() => useRandomCarousel([]));
    expect(empty.result.current.peekPrev).toBeNull();
    expect(empty.result.current.peekNext).toBeNull();
    expect(empty.result.current.current).toBeUndefined();
  });

  it('resets index to 0 when the pool reference changes', () => {
    const poolA = makePool(3);
    const poolB = makePool(5);
    const { result, rerender } = renderHook(({ pool }) => useRandomCarousel(pool), {
      initialProps: { pool: poolA },
    });
    act(() => result.current.next());
    act(() => result.current.next());
    expect(result.current.index).toBe(2);

    rerender({ pool: poolB });
    expect(result.current.index).toBe(0);
    expect(result.current.current?.id).toBe(1);
  });

  it('is a no-op when pool is empty', () => {
    const { result } = renderHook(() => useRandomCarousel([]));
    act(() => result.current.next());
    act(() => result.current.prev());
    expect(result.current.index).toBe(0);
    expect(reshuffleSpy).not.toHaveBeenCalled();
  });

  it('responds to ArrowRight and ArrowLeft keydown events', () => {
    const pool = makePool(3);
    const { result } = renderHook(() => useRandomCarousel(pool));

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    });
    expect(result.current.index).toBe(1);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    });
    expect(result.current.index).toBe(0);
  });

  it('ignores arrow keys when the event target is an input', () => {
    const pool = makePool(3);
    const { result } = renderHook(() => useRandomCarousel(pool));

    const input = document.createElement('input');
    document.body.appendChild(input);
    const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });
    Object.defineProperty(event, 'target', { value: input });
    act(() => {
      window.dispatchEvent(event);
    });

    expect(result.current.index).toBe(0);
    document.body.removeChild(input);
  });
});
