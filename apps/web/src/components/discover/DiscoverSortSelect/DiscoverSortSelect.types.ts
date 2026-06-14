import type { DiscoverSort } from '@shiroani/shared';

export interface IDiscoverSortSelectProps {
  value: DiscoverSort;
  onChange: (sort: DiscoverSort) => void;
  disabled?: boolean;
}

export interface IDiscoverSortSelectView {}
