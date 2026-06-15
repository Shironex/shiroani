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
  useFilterTabBar();

  const tabButtons = tabs.map(tab => {
    const isActive = active === tab.value;
    const Icon = tab.Icon;
    return (
      <button
        key={tab.value}
        role="tab"
        aria-selected={isActive}
        onClick={() => onChange(tab.value)}
        title={tab.tooltip}
        className={cn(
          'relative px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap',
          'transition-all duration-200',
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
