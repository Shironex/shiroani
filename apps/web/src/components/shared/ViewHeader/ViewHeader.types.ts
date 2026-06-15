import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { FilterTab } from '@/components/shared/FilterTabBar';

export interface IViewHeaderProps<T extends string = string> {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  /** Search handlers — when omitted, the search input is not rendered. */
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;
  /** Filter tabs — when omitted, the tab row is not rendered. */
  filters?: FilterTab<T>[];
  activeFilter?: T;
  onFilterChange?: (filter: T) => void;
  viewMode?: 'grid' | 'list';
  onViewModeChange?: (mode: 'grid' | 'list') => void;
}

export type IViewHeaderView = Record<string, never>;
