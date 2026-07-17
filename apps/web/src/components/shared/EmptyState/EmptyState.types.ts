import type { LucideIcon } from 'lucide-react';

export interface IEmptyStateAction {
  label: string;
  onClick: () => void;
  icon?: LucideIcon;
}

export interface IEmptyStateProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  action?: IEmptyStateAction;
  /**
   * Visual tone. `default` is the neutral primary-accented placeholder;
   * `destructive` recolors the icon tile and action for error surfaces.
   */
  tone?: 'default' | 'destructive';
}

export type IEmptyStateView = Record<string, never>;
