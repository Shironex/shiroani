import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { useAppStore, type ActiveView } from '@/stores/useAppStore';
import { useDockStore } from '@/stores/useDockStore';
import { useDockDrag } from '@/hooks/useDockDrag';
import { ALL_NAV_ITEMS, ALWAYS_VISIBLE_VIEWS, type NavItem } from '@/lib/nav-items';
import {
  COLLAPSE_DELAY,
  EXPAND_ORIGINS,
  getDockStyle,
  getPillStyle,
  isVerticalEdge,
} from './NavigationDock.parts';
import type { INavigationDockProps, INavigationDockView } from './NavigationDock.types';

export function useNavigationDock({ hasBg }: INavigationDockProps): INavigationDockView {
  const activeView = useAppStore(s => s.activeView);
  const navigateTo = useAppStore(s => s.navigateTo);

  const edge = useDockStore(s => s.edge);
  const offset = useDockStore(s => s.offset);
  const autoHide = useDockStore(s => s.autoHide);
  const draggable = useDockStore(s => s.draggable);
  const showLabels = useDockStore(s => s.showLabels);
  const hiddenViews = useDockStore(s => s.hiddenViews);
  const order = useDockStore(s => s.order);
  const isDragging = useDockStore(s => s.isDragging);
  const dragPosition = useDockStore(s => s.dragPosition);
  const isExpanded = useDockStore(s => s.isExpanded);
  const setExpanded = useDockStore(s => s.setExpanded);

  const dragHandlers = useDockDrag();
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track collapsing state for exit animation
  const [isCollapsing, setIsCollapsing] = useState(false);
  // Track snap bounce after drag ends
  const [justSnapped, setJustSnapped] = useState(false);
  const prevDragging = useRef(isDragging);

  const visibleItems = useMemo<NavItem[]>(() => {
    const hiddenSet = new Set(hiddenViews);
    const itemById = new Map(ALL_NAV_ITEMS.map(item => [item.id, item]));
    return order
      .map(id => itemById.get(id))
      .filter(
        (item): item is NavItem =>
          item !== undefined && (ALWAYS_VISIBLE_VIEWS.has(item.id) || !hiddenSet.has(item.id))
      );
  }, [order, hiddenViews]);

  const activeIndex = visibleItems.findIndex(item => item.id === activeView);
  const vertical = isVerticalEdge(edge);

  const dockStyle = getDockStyle(edge, offset, isDragging, dragPosition);
  // If the active view is somehow not in the visible list (e.g. user just hid it
  // from settings before the redirect lands), don't render the pill at a bogus
  // negative offset.
  const pillStyle =
    activeIndex >= 0 ? getPillStyle(activeIndex, vertical, showLabels) : { display: 'none' };

  // Show expanded dock (full nav) when: not auto-hide, or expanded, or collapsing (exit anim)
  const showFullDock = !autoHide || isExpanded || isCollapsing || isDragging;

  // Detect drag→snap transition for bounce animation
  useEffect(() => {
    if (prevDragging.current && !isDragging) {
      setJustSnapped(true);
    }
    prevDragging.current = isDragging;
  }, [isDragging]);

  // Clamp dock position on window resize so it doesn't go off-screen
  useEffect(() => {
    const handleResize = () => {
      const { offset: currentOffset } = useDockStore.getState();
      const clamped = Math.max(5, Math.min(95, currentOffset));
      if (clamped !== currentOffset) {
        useDockStore.getState().setOffset(clamped);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (collapseTimer.current) {
      clearTimeout(collapseTimer.current);
      collapseTimer.current = null;
    }
    // Cancel ongoing collapse animation
    if (isCollapsing) {
      setIsCollapsing(false);
    }
    if (autoHide && !isExpanded) {
      setExpanded(true);
    }
  }, [autoHide, isExpanded, isCollapsing, setExpanded]);

  const handleMouseLeave = useCallback(() => {
    if (autoHide && isExpanded && !isDragging) {
      collapseTimer.current = setTimeout(() => {
        // Start collapse animation instead of immediately hiding
        setIsCollapsing(true);
        setExpanded(false);
        collapseTimer.current = null;
      }, COLLAPSE_DELAY);
    }
  }, [autoHide, isExpanded, isDragging, setExpanded]);

  // When collapse animation finishes, clear the collapsing state
  const handleAnimationEnd = useCallback(
    (e: React.AnimationEvent) => {
      if (isCollapsing && e.animationName === 'dock-collapse') {
        setIsCollapsing(false);
      }
    },
    [isCollapsing]
  );

  // Cleanup timer
  useEffect(() => {
    return () => {
      if (collapseTimer.current) clearTimeout(collapseTimer.current);
    };
  }, []);

  // Determine animation class
  const getAnimationClass = useCallback(() => {
    if (!autoHide) return 'animate-slide-up motion-reduce:animate-none';
    if (isCollapsing) {
      return cn(
        'animate-[dock-collapse_350ms_cubic-bezier(0.4,0,1,1)_both] motion-reduce:animate-none',
        EXPAND_ORIGINS[edge]
      );
    }
    if (isExpanded) {
      return cn(
        'animate-[dock-expand_450ms_cubic-bezier(0.16,1,0.3,1)_both] motion-reduce:animate-none',
        EXPAND_ORIGINS[edge]
      );
    }
    return '';
  }, [autoHide, isCollapsing, isExpanded, edge]);

  const handleDockAnimationEnd = useCallback(
    (e: React.AnimationEvent) => {
      handleAnimationEnd(e);
      if (justSnapped && e.animationName === 'dock-snap') {
        setJustSnapped(false);
      }
    },
    [handleAnimationEnd, justSnapped]
  );

  const handleNavItemClick = useCallback(
    (id: ActiveView) => {
      // Suppress click if pointer was a drag
      if (dragHandlers.hasDraggedRef.current) return;
      navigateTo(id);
    },
    [dragHandlers, navigateTo]
  );

  const handleCollapsedClick = useCallback(() => {
    if (dragHandlers.hasDraggedRef.current) return;
    setExpanded(true);
  }, [dragHandlers, setExpanded]);

  return {
    hasBg,
    edge,
    vertical,
    draggable,
    showLabels,
    isDragging,
    justSnapped,
    showFullDock,
    visibleItems,
    activeView,
    dockStyle,
    pillStyle,
    dragHandlers,
    handleMouseEnter,
    handleMouseLeave,
    handleDockAnimationEnd,
    getAnimationClass,
    handleNavItemClick,
    handleCollapsedClick,
  };
}
