import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStickyTail } from '../useStickyTail';

/**
 * jsdom does not lay out elements, so scroll geometry is always 0. We attach a
 * real div to the ref and override the geometry getters/setters to simulate a
 * scroll container.
 */
function makeScrollEl(opts: { scrollHeight: number; clientHeight: number }): HTMLDivElement {
  const el = document.createElement('div');
  let scrollTop = 0;
  Object.defineProperty(el, 'scrollHeight', { value: opts.scrollHeight, configurable: true });
  Object.defineProperty(el, 'clientHeight', { value: opts.clientHeight, configurable: true });
  Object.defineProperty(el, 'scrollTop', {
    get: () => scrollTop,
    set: v => {
      scrollTop = v;
    },
    configurable: true,
  });
  return el;
}

function attach(result: { current: ReturnType<typeof useStickyTail> }, el: HTMLDivElement) {
  // RefObject is mutable at runtime even though typed readonly.
  (result.current.listRef as { current: HTMLDivElement | null }).current = el;
}

describe('useStickyTail', () => {
  beforeEach(() => {
    // each test builds its own element
  });

  it('starts engaged: autoScroll true, jump-to-tail hidden', () => {
    const { result } = renderHook(() =>
      useStickyTail({ tailTrigger: [], paused: false, resetSignal: 0 })
    );
    expect(result.current.autoScroll).toBe(true);
    expect(result.current.showJumpToTail).toBe(false);
  });

  it('handleScroll near the bottom keeps tail-following engaged', () => {
    const { result } = renderHook(() =>
      useStickyTail({ tailTrigger: [], paused: false, resetSignal: 0 })
    );
    const el = makeScrollEl({ scrollHeight: 1000, clientHeight: 200 });
    el.scrollTop = 790; // distanceFromBottom = 1000 - 790 - 200 = 10 (<= 20)
    attach(result, el);
    act(() => result.current.handleScroll());
    expect(result.current.autoScroll).toBe(true);
    expect(result.current.showJumpToTail).toBe(false);
  });

  it('handleScroll up past the threshold disengages and shows jump-to-tail', () => {
    const { result } = renderHook(() =>
      useStickyTail({ tailTrigger: [], paused: false, resetSignal: 0 })
    );
    const el = makeScrollEl({ scrollHeight: 1000, clientHeight: 200 });
    el.scrollTop = 100; // distanceFromBottom = 700 (> 20)
    attach(result, el);
    act(() => result.current.handleScroll());
    expect(result.current.autoScroll).toBe(false);
    expect(result.current.showJumpToTail).toBe(true);
  });

  it('jumpToTail scrolls to the bottom and re-engages', () => {
    const { result } = renderHook(() =>
      useStickyTail({ tailTrigger: [], paused: false, resetSignal: 0 })
    );
    const el = makeScrollEl({ scrollHeight: 1000, clientHeight: 200 });
    el.scrollTop = 0;
    attach(result, el);
    // First scroll up to disengage.
    act(() => result.current.handleScroll());
    expect(result.current.autoScroll).toBe(false);
    // Then jump to tail.
    act(() => result.current.jumpToTail());
    expect(el.scrollTop).toBe(1000);
    expect(result.current.autoScroll).toBe(true);
    expect(result.current.showJumpToTail).toBe(false);
  });

  it('re-engages tail-following when resetSignal changes', () => {
    const { result, rerender } = renderHook(
      ({ resetSignal }) => useStickyTail({ tailTrigger: [], paused: false, resetSignal }),
      { initialProps: { resetSignal: 0 } }
    );
    const el = makeScrollEl({ scrollHeight: 1000, clientHeight: 200 });
    el.scrollTop = 0;
    attach(result, el);
    act(() => result.current.handleScroll());
    expect(result.current.autoScroll).toBe(false);
    expect(result.current.showJumpToTail).toBe(true);

    rerender({ resetSignal: 1 });
    expect(result.current.autoScroll).toBe(true);
    expect(result.current.showJumpToTail).toBe(false);
  });

  it('auto-scrolls to the bottom when the tail trigger changes (engaged, not paused)', () => {
    const { result, rerender } = renderHook(
      ({ trigger }) => useStickyTail({ tailTrigger: trigger, paused: false, resetSignal: 0 }),
      { initialProps: { trigger: 0 } }
    );
    const el = makeScrollEl({ scrollHeight: 1000, clientHeight: 200 });
    el.scrollTop = 0;
    attach(result, el);
    rerender({ trigger: 1 });
    expect(el.scrollTop).toBe(1000);
  });

  it('does not auto-scroll while paused', () => {
    const { result, rerender } = renderHook(
      ({ trigger, paused }) => useStickyTail({ tailTrigger: trigger, paused, resetSignal: 0 }),
      { initialProps: { trigger: 0, paused: true } }
    );
    const el = makeScrollEl({ scrollHeight: 1000, clientHeight: 200 });
    el.scrollTop = 0;
    attach(result, el);
    rerender({ trigger: 1, paused: true });
    expect(el.scrollTop).toBe(0);
  });

  it('does not auto-scroll when the user has scrolled up (autoScroll disengaged)', () => {
    const { result, rerender } = renderHook(
      ({ trigger }) => useStickyTail({ tailTrigger: trigger, paused: false, resetSignal: 0 }),
      { initialProps: { trigger: 0 } }
    );
    const el = makeScrollEl({ scrollHeight: 1000, clientHeight: 200 });
    el.scrollTop = 100;
    attach(result, el);
    act(() => result.current.handleScroll()); // disengage
    el.scrollTop = 100; // pretend the user is still scrolled up
    rerender({ trigger: 1 });
    expect(el.scrollTop).toBe(100);
  });
});
