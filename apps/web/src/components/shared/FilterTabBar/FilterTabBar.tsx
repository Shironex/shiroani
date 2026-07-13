import { cn } from '@/lib/utils';
import { useFilterTabBar } from './FilterTabBar.hooks';
import type { IFilterTabBarProps } from './FilterTabBar.types';

/**
 * Filter tab row — horizontal pill buttons with an active `bg-primary/15` state
 * and a 4px primary underline. Extracted from ViewHeader so other views can
 * reuse the same tab affordance without the surrounding `.vh` chrome.
 */
export default function FilterTabBar<T extends string = string>({
  tabs,
  active,
  onChange,
  ariaLabel,
  className,
}: IFilterTabBarProps<T>) {
  const { registerTab, handleKeyDown } = useFilterTabBar<T>({ tabs, active, onChange });

  const tabButtons = tabs.map((tab, index) => {
    const isActive = active === tab.value;
    const Icon = tab.Icon;
    return (
      <button
        key={tab.value}
        ref={registerTab(index)}
        role="tab"
        aria-selected={isActive}
        // Roving tabindex: only the selected tab is in the tab order; arrows
        // move between the rest.
        tabIndex={isActive ? 0 : -1}
        onClick={() => onChange(tab.value)}
        onKeyDown={handleKeyDown}
        title={tab.tooltip}
        className={cn(
          'relative px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap',
          'transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
          Icon && 'inline-flex items-center gap-1.5',
          isActive
            ? 'bg-primary/15 text-primary'
            : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground/80'
        )}
      >
        {Icon && <Icon className="w-3.5 h-3.5" aria-hidden="true" />}
        {tab.label}
        {isActive && (
          <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-primary" />
        )}
      </button>
    );
  });

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn('flex items-center gap-1 overflow-x-auto scrollbar-hide -mx-1 px-1', className)}
    >
      {tabButtons}
    </div>
  );
}
