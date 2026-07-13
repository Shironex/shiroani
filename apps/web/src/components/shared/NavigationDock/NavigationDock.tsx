import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { APP_LOGO_URL } from '@/lib/constants';
import { useNavigationDock } from './NavigationDock.hooks';
import { DockDragHandle, DockItem, EXPAND_ORIGINS } from './NavigationDock.parts';
import type { INavigationDockProps } from './NavigationDock.types';

export default function NavigationDock({ hasBg }: INavigationDockProps) {
  const { t } = useTranslation('nav');
  const {
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
  } = useNavigationDock({ hasBg });

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
          onClick={handleCollapsedClick}
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
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
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

  const dockItems = visibleItems.map(item => (
    <DockItem
      key={item.id}
      item={item}
      isActive={activeView === item.id}
      isVertical={vertical}
      showLabel={showLabels}
      onClick={() => handleNavItemClick(item.id)}
    />
  ));

  return (
    <nav
      aria-label={t('ariaPrimary')}
      style={dockStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        onAnimationEnd={handleDockAnimationEnd}
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
            'pointer-events-none absolute bg-gradient-to-r from-transparent via-foreground/10 to-transparent',
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
            // Narrowed from transition-all: the pill only ever animates its
            // position/size (top/left/width/height via pillStyle).
            'transition-[top,left,width,height] duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)]',
            'motion-reduce:transition-none'
          )}
          style={pillStyle}
        />

        {dockItems}

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
