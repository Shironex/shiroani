import type { KeyboardEvent } from 'react';
import type { LucideIcon } from 'lucide-react';

export type FilterTab<T extends string = string> = {
  value: T;
  label: string;
  Icon?: LucideIcon;
  tooltip?: string;
};

export type FilterTabBarProps<T extends string = string> = {
  tabs: FilterTab<T>[];
  active: T;
  onChange: (value: T) => void;
  ariaLabel?: string;
  className?: string;
};

export type IFilterTabBarProps<T extends string = string> = FilterTabBarProps<T>;

export interface IFilterTabBarView {
  readonly registerTab: (index: number) => (el: HTMLButtonElement | null) => void;
  readonly handleKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => void;
}
