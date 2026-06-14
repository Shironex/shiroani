import type { Bookmark } from 'lucide-react';

export interface IPanelHeaderProps {
  id: string;
  icon: typeof Bookmark;
  title: string;
  meta?: string;
}

export type IPanelHeaderView = Record<string, never>;
