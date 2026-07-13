import { useCallback, useRef, type KeyboardEvent } from 'react';
import type { FilterTab, IFilterTabBarView } from './FilterTabBar.types';

interface IUseFilterTabBarArgs<T extends string> {
  tabs: FilterTab<T>[];
  active: T;
  onChange: (value: T) => void;
}

/**
 * Roving-tabindex keyboard support for the tablist, mirroring
 * {@link useDockEdgePicker}: only the active tab is tabbable, and Arrow / Home /
 * End move the selection (with wrap) and shift focus to the new tab.
 */
export function useFilterTabBar<T extends string>({
  tabs,
  active,
  onChange,
}: IUseFilterTabBarArgs<T>): IFilterTabBarView {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const select = useCallback(
    (index: number) => {
      const tab = tabs[index];
      if (!tab) return;
      onChange(tab.value);
      tabRefs.current[index]?.focus();
    },
    [tabs, onChange]
  );

  const move = useCallback(
    (delta: number) => {
      const currentIndex = tabs.findIndex(t => t.value === active);
      if (currentIndex === -1) return;
      select((currentIndex + delta + tabs.length) % tabs.length);
    },
    [tabs, active, select]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        move(1);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        move(-1);
      } else if (e.key === 'Home') {
        e.preventDefault();
        select(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        select(tabs.length - 1);
      }
    },
    [move, select, tabs.length]
  );

  const registerTab = useCallback(
    (index: number) => (el: HTMLButtonElement | null) => {
      tabRefs.current[index] = el;
    },
    []
  );

  return { registerTab, handleKeyDown };
}
