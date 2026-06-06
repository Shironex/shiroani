import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BookOpen,
  Calendar,
  Compass,
  GripHorizontal,
  GripVertical,
  History,
  NotebookPen,
  Rss,
  Settings,
  User,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore, type ActiveView } from '@/stores/useAppStore';
import { useDockStore, type DockEdge } from '@/stores/useDockStore';
import { useDockDrag, type DockDragHandlers } from '@/hooks/useDockDrag';
import { APP_LOGO_URL } from '@/lib/constants';
import { ALL_NAV_ITEMS, ALWAYS_VISIBLE_VIEWS, type NavItem } from '@/lib/nav-items';

// Layout constants (rem) — keep in sync with classNames below so root font scaling
// changes the pill geometry together with the dock items.
// Pre-redesign sizing: 6px padding, 4px gap, 40×40 rounded-full icon slots.
// User prefers the pre-redesign 40px buttons over the phase 1 mock's 32px.
const GAP_REM = 0.25; // gap-[4px]
const PAD_REM = 0.375; // p-1.5 → 6px on both axes in the floating pill

function toRem(value: number): string {
  return `${value}rem`;
}

function getDockMetrics(isVertical: boolean, showLabels: boolean) {
  if (isVertical) {
    return {
      itemWidthRem: showLabels ? 3 : 2.5, // w-12 / size-10
      itemHeightRem: showLabels ? 3.5 : 2.5, // h-14 / size-10
      padXRem: PAD_REM,
      padYRem: PAD_REM,
      gapRem: GAP_REM,
    };
  }

  return {
    itemWidthRem: showLabels ? 4.5 : 2.5, // w-[4.5rem] / size-10
    itemHeightRem: showLabels ? 3 : 2.5, // h-12 / size-10
    padXRem: PAD_REM,
    padYRem: PAD_REM,
    gapRem: GAP_REM,
  };
}

const COLLAPSE_DELAY = 400; // ms before starting collapse after mouse leave
const EDGE_MARGIN = 12; // px from viewport edge

// ── Edge-aware animation origins ──────────────────────────────────

const EXPAND_ORIGINS: Record<DockEdge, string> = {
  bottom: 'origin-bottom',
  top: 'origin-top',
  left: 'origin-left',
  right: 'origin-right',
};

/** Renders the icon for each nav item with per-item hover/active animations */
function DockIcon({ id, isActive }: { id: ActiveView; isActive: boolean }) {
  const base =
    'w-[18px] h-[18px] transition-transform duration-300 ease-out motion-reduce:transition-none';

  switch (id) {
    case 'browser':
      return (
        <img
          src={APP_LOGO_URL}
          alt=""
          draggable={false}
          className={cn(
            'w-5 h-5 object-contain transition-transform duration-300 ease-out motion-reduce:transition-none',
            isActive && 'animate-[dock-bob_2s_ease-in-out_infinite] motion-reduce:animate-none'
          )}
        />
      );
    case 'library':
      return (
        <BookOpen
          className={cn(
            base,
            'group-hover:rotate-[-8deg] group-hover:scale-110',
            isActive && 'animate-[dock-wiggle_2.5s_ease-in-out_infinite] motion-reduce:animate-none'
          )}
        />
      );
    case 'discover':
      return (
        <Compass
          className={cn(
            base,
            'group-hover:rotate-[30deg] group-hover:scale-110',
            isActive && 'animate-[dock-spin_4s_linear_infinite] motion-reduce:animate-none'
          )}
        />
      );
    case 'diary':
      return (
        <NotebookPen
          className={cn(
            base,
            'group-hover:rotate-[-6deg] group-hover:scale-110',
            isActive && 'animate-[dock-wiggle_2.5s_ease-in-out_infinite] motion-reduce:animate-none'
          )}
        />
      );
    case 'schedule':
      return (
        <Calendar
          className={cn(
            base,
            'group-hover:scale-110 group-hover:-translate-y-0.5',
            isActive && 'animate-[dock-pulse_2s_ease-in-out_infinite] motion-reduce:animate-none'
          )}
        />
      );
    case 'feed':
      return (
        <Rss
          className={cn(
            base,
            'group-hover:scale-110 group-hover:-translate-y-0.5',
            isActive && 'animate-[dock-pulse_2s_ease-in-out_infinite] motion-reduce:animate-none'
          )}
        />
      );
    case 'social':
      return (
        <Users
          className={cn(
            base,
            'group-hover:scale-110 group-hover:-translate-y-0.5',
            isActive && 'animate-[dock-pulse_2s_ease-in-out_infinite] motion-reduce:animate-none'
          )}
        />
      );
    case 'profile':
      return (
        <User
          className={cn(
            base,
            'group-hover:scale-110 group-hover:-translate-y-0.5',
            isActive && 'animate-[dock-pulse_2s_ease-in-out_infinite] motion-reduce:animate-none'
          )}
        />
      );
    case 'changelog':
      return (
        <History
          className={cn(
            base,
            'group-hover:rotate-[-12deg] group-hover:scale-110',
            isActive && 'animate-[dock-wiggle_2.5s_ease-in-out_infinite] motion-reduce:animate-none'
          )}
        />
      );
    case 'settings':
      return (
        <Settings
          className={cn(
            base,
            'group-hover:rotate-90',
            isActive && 'animate-[dock-spin_4s_linear_infinite] motion-reduce:animate-none'
          )}
        />
      );
  }
}

function DockItem({
  item,
  isActive,
  isVertical,
  showLabel,
  onClick,
}: {
  item: NavItem;
  isActive: boolean;
  isVertical: boolean;
  showLabel: boolean;
  onClick: () => void;
}) {
  const { t } = useTranslation('nav');
  const label = t(`link.${item.id}`, { defaultValue: item.label });
  const [ripple, setRipple] = useState(false);

  const handleClick = useCallback(() => {
    if (!isActive) {
      setRipple(true);
    }
    onClick();
  }, [isActive, onClick]);

  return (
    <button
      onClick={handleClick}
      onAnimationEnd={() => ripple && setRipple(false)}
      aria-current={isActive ? 'page' : undefined}
      aria-label={label}
      data-view={item.id}
      className={cn(
        'group relative z-[1] flex items-center justify-center',
        // Floating pill dock uses circular slots without labels; labeled mode
        // keeps a soft rounded-xl rectangle for the extra text room.
        showLabel ? 'rounded-xl overflow-hidden' : 'rounded-full overflow-hidden',
        'transition-[color,transform] duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)]',
        'motion-reduce:transition-none',
        'hover:scale-110 active:scale-95',
        showLabel && 'gap-1 flex-col',
        showLabel ? (isVertical ? 'w-12 h-14' : 'w-[4.5rem] h-12') : 'size-10',
        isActive ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
      )}
    >
      {/* Click ripple */}
      {ripple && (
        <span
          className="pointer-events-none absolute inset-0 flex items-center justify-center motion-reduce:hidden"
          aria-hidden="true"
        >
          <span className="absolute h-6 w-6 rounded-full bg-primary-foreground/25 animate-[dock-ripple_400ms_ease-out_both]" />
        </span>
      )}
      <DockIcon id={item.id} isActive={isActive} />
      {showLabel && (
        <span
          className={cn(
            'text-[10px] leading-none font-medium truncate max-w-full tracking-tight',
            isActive ? 'text-primary-foreground/90' : 'text-muted-foreground/70'
          )}
        >
          {label}
        </span>
      )}
    </button>
  );
}

// ── Position helpers ──────────────────────────────────────────────

function isVerticalEdge(edge: DockEdge): boolean {
  return edge === 'left' || edge === 'right';
}

/** Compute CSS position for the dock based on edge + offset */
function getDockStyle(
  edge: DockEdge,
  offset: number,
  isDragging: boolean,
  dragPosition: { x: number; y: number } | null
): React.CSSProperties {
  // During drag, position at cursor
  if (isDragging && dragPosition) {
    return {
      position: 'fixed',
      left: dragPosition.x,
      top: dragPosition.y,
      transform: 'translate(-50%, -50%)',
      zIndex: 50,
      transition: 'none',
    };
  }

  const style: React.CSSProperties = {
    position: 'fixed',
    zIndex: 40,
    transition: 'all 300ms cubic-bezier(0.25, 0.1, 0.25, 1)',
  };

  switch (edge) {
    case 'bottom':
      style.bottom = EDGE_MARGIN;
      style.left = `${offset}%`;
      style.transform = 'translateX(-50%)';
      break;
    case 'top':
      style.top = EDGE_MARGIN;
      style.left = `${offset}%`;
      style.transform = 'translateX(-50%)';
      break;
    case 'left':
      style.left = EDGE_MARGIN;
      style.top = `${offset}%`;
      style.transform = 'translateY(-50%)';
      break;
    case 'right':
      style.right = EDGE_MARGIN;
      style.top = `${offset}%`;
      style.transform = 'translateY(-50%)';
      break;
  }

  return style;
}

/** Get the sliding pill style for horizontal or vertical layout */
function getPillStyle(
  activeIndex: number,
  isVertical: boolean,
  showLabels: boolean
): React.CSSProperties {
  const { itemWidthRem, itemHeightRem, padXRem, padYRem, gapRem } = getDockMetrics(
    isVertical,
    showLabels
  );

  if (isVertical) {
    return {
      height: toRem(itemHeightRem),
      top: toRem(padYRem + activeIndex * (itemHeightRem + gapRem)),
      width: `calc(100% - ${toRem(padXRem * 2)})`,
      left: toRem(padXRem),
    };
  }
  return {
    width: toRem(itemWidthRem),
    height: `calc(100% - ${toRem(padYRem * 2)})`,
    top: toRem(padYRem),
    left: toRem(padXRem + activeIndex * (itemWidthRem + gapRem)),
  };
}

// ── Drag handle sub-component ─────────────────────────────────────

interface DockDragHandleProps {
  vertical: boolean;
  showLabels: boolean;
  draggable: boolean;
  isDragging: boolean;
  dragHandlers: DockDragHandlers;
  hasVisibleItems: boolean;
}

function DockDragHandle({
  vertical,
  showLabels,
  draggable,
  isDragging,
  dragHandlers,
  hasVisibleItems,
}: DockDragHandleProps) {
  const { t } = useTranslation('nav');
  if (!draggable) return null;

  const GripIcon = vertical ? GripHorizontal : GripVertical;

  // Size matches getDockMetrics slot dimensions exactly
  const buttonClass = cn(
    'relative z-[1] flex items-center justify-center flex-shrink-0 touch-none',
    vertical ? (showLabels ? 'w-12 h-6' : 'size-10') : showLabels ? 'h-12 w-6' : 'size-10',
    showLabels ? 'rounded-xl' : 'rounded-full',
    'transition-[color,background-color] duration-150',
    'text-muted-foreground/50',
    'hover:text-foreground hover:bg-foreground/5 hover:cursor-grab',
    'active:cursor-grabbing active:bg-foreground/10',
    isDragging && 'text-primary bg-primary/15',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-card'
  );

  const dividerClass = cn(
    'flex-shrink-0 bg-border-glass/50',
    vertical ? 'h-px self-stretch my-0.5' : 'w-px self-stretch mx-0.5'
  );

  return (
    <>
      {hasVisibleItems && <span aria-hidden="true" className={dividerClass} />}
      <button
        type="button"
        aria-label={t('tooltip.moveDock')}
        title={t('tooltip.moveDock')}
        className={buttonClass}
        onPointerDown={dragHandlers.onPointerDown}
        onPointerMove={dragHandlers.onPointerMove}
        onPointerUp={dragHandlers.onPointerUp}
        onPointerCancel={dragHandlers.onPointerCancel}
      >
        <GripIcon className="w-3.5 h-3.5" />
      </button>
    </>
  );
}

// ── Main component ────────────────────────────────────────────────

interface NavigationDockProps {
  hasBg: boolean;
}

export function NavigationDock({ hasBg }: NavigationDockProps) {
  const { t } = useTranslation('nav');
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
  const getAnimationClass = () => {
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
  };

  if (!showFullDock) {
    // Collapsed: show only the logo
    return (
      <nav aria-label={t('ariaPrimary')}>
        <button
          type="button"
          aria-label={t('ariaExpand')}
          style={dockStyle}
          onMouseEnter={handleMouseEnter}
          onPointerDown={draggable ? dragHandlers.onPointerDown : undefined}
          onPointerMove={draggable ? dragHandlers.onPointerMove : undefined}
          onPointerUp={draggable ? dragHandlers.onPointerUp : undefined}
          onPointerCancel={draggable ? dragHandlers.onPointerCancel : undefined}
          onClick={() => {
            if (dragHandlers.hasDraggedRef.current) return;
            setExpanded(true);
          }}
          className={cn(
            'flex items-center justify-center',
            'w-10 h-10 rounded-full',
            'border border-border-glass',
            'shadow-[0_16px_36px_-10px_rgba(0,0,0,0.5)]',
            'backdrop-blur-[18px]',
            'animate-[dock-expand_450ms_cubic-bezier(0.16,1,0.3,1)_both] motion-reduce:animate-none',
            EXPAND_ORIGINS[edge],
            draggable && 'cursor-grab active:cursor-grabbing touch-none',
            'transition-shadow duration-300 ease-out',
            'hover:scale-110 hover:shadow-[0_20px_40px_-8px_rgba(0,0,0,0.55)]',
            hasBg ? 'bg-black/45' : 'bg-card/70'
          )}
        >
          <img
            src={APP_LOGO_URL}
            alt={t('logoAlt')}
            draggable={false}
            className="w-6 h-6 object-contain"
          />
        </button>
      </nav>
    );
  }

  return (
    <nav
      aria-label={t('ariaPrimary')}
      style={dockStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        onAnimationEnd={e => {
          handleAnimationEnd(e);
          if (justSnapped && e.animationName === 'dock-snap') {
            setJustSnapped(false);
          }
        }}
        className={cn(
          'relative flex items-center gap-1 rounded-full',
          'border border-border-glass',
          'shadow-[0_16px_36px_-10px_rgba(0,0,0,0.5)]',
          'backdrop-blur-[18px]',
          'select-none',
          isDragging && 'opacity-95',
          justSnapped &&
            'animate-[dock-snap_500ms_cubic-bezier(0.34,1.56,0.64,1)_both] motion-reduce:animate-none',
          !justSnapped && getAnimationClass(),
          'transition-[opacity,transform,box-shadow] duration-200',
          vertical ? 'flex-col p-1.5' : 'flex-row p-1.5',
          hasBg ? 'bg-black/45' : 'bg-card/70'
        )}
      >
        {/* Subtle top/left highlight — sits along the inner edge of the pill */}
        <div
          className={cn(
            'pointer-events-none absolute bg-gradient-to-r from-transparent via-white/10 to-transparent',
            vertical ? 'inset-y-3 left-0 w-px bg-gradient-to-b' : 'inset-x-4 top-0 h-px'
          )}
        />

        {/* Sliding active pill — circular in no-label mode, soft-rounded with labels */}
        <div
          className={cn(
            'absolute',
            showLabels ? 'rounded-xl' : 'rounded-full',
            'bg-primary',
            'animate-[dock-pill-glow_3s_ease-in-out_infinite] motion-reduce:animate-none',
            'transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)]',
            'motion-reduce:transition-none'
          )}
          style={pillStyle}
        />

        {visibleItems.map(item => (
          <DockItem
            key={item.id}
            item={item}
            isActive={activeView === item.id}
            isVertical={vertical}
            showLabel={showLabels}
            onClick={() => {
              // Suppress click if pointer was a drag
              if (dragHandlers.hasDraggedRef.current) return;
              navigateTo(item.id);
            }}
          />
        ))}

        <DockDragHandle
          vertical={vertical}
          showLabels={showLabels}
          draggable={draggable}
          isDragging={isDragging}
          dragHandlers={dragHandlers}
          hasVisibleItems={visibleItems.length > 0}
        />
      </div>
    </nav>
  );
}
