import { useCallback, useEffect, useRef, useState } from 'react';

const SCROLL_STICKY_THRESHOLD = 20;

export interface StickyTail {
  /** Attach to the scrollable list container. */
  listRef: React.RefObject<HTMLDivElement | null>;
  /** True while the view is following the tail (auto-scrolling to bottom). */
  autoScroll: boolean;
  /** True when the user has scrolled up and a "jump to tail" affordance applies. */
  showJumpToTail: boolean;
  /** onScroll handler for the list container. */
  handleScroll: () => void;
  /** Snap to the bottom and re-engage tail-following. */
  jumpToTail: () => void;
}

interface UseStickyTailOptions {
  /**
   * Value that changes whenever the list content grows (e.g. the filtered
   * entries array) — drives the auto-scroll effect.
   */
  tailTrigger: unknown;
  /** When true, suppresses auto-scroll (the live feed is frozen). */
  paused: boolean;
  /**
   * A monotonically increasing token. Whenever it changes, tail-following is
   * re-engaged without scrolling (used on open / source change / resume). The
   * data layer owns this signal so the two hooks stay decoupled.
   */
  resetSignal: number;
}

/**
 * Tracks the "stick to the bottom unless the user scrolled up" behavior for a
 * scrollable log list. When `autoScroll` is engaged and not `paused`, newly
 * arrived `tailTrigger` values snap the list to its bottom; scrolling up past a
 * small threshold disengages auto-scroll and surfaces a jump-to-tail affordance.
 */
export function useStickyTail({
  tailTrigger,
  paused,
  resetSignal,
}: UseStickyTailOptions): StickyTail {
  const listRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showJumpToTail, setShowJumpToTail] = useState(false);

  // Re-engage tail-following whenever the data layer signals a reset.
  useEffect(() => {
    setAutoScroll(true);
    setShowJumpToTail(false);
  }, [resetSignal]);

  // Auto-scroll when new content arrives, unless paused or the user scrolled up.
  useEffect(() => {
    if (!listRef.current) return;
    if (paused) return;
    if (!autoScroll) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [tailTrigger, paused, autoScroll]);

  const handleScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = distanceFromBottom <= SCROLL_STICKY_THRESHOLD;
    if (nearBottom) {
      if (!autoScroll) setAutoScroll(true);
      if (showJumpToTail) setShowJumpToTail(false);
    } else {
      if (autoScroll) setAutoScroll(false);
      if (!showJumpToTail) setShowJumpToTail(true);
    }
  }, [autoScroll, showJumpToTail]);

  const jumpToTail = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    setAutoScroll(true);
    setShowJumpToTail(false);
  }, []);

  return { listRef, autoScroll, showJumpToTail, handleScroll, jumpToTail };
}
