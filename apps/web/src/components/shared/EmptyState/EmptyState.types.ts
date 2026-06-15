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
}

export type IEmptyStateView = Record<string, never>;
