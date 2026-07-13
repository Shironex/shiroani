import type { ReactNode } from 'react';
import type { Bookmark } from 'lucide-react';

export interface IPanelHeaderProps {
  id: string;
  icon: typeof Bookmark;
  title: string;
  /** Optional trailing meta text (e.g. a count), right-aligned before `action`. */
  meta?: ReactNode;
  /** Optional trailing control (e.g. a "view all" link), rendered at the far end. */
  action?: ReactNode;
}

export type IPanelHeaderView = Record<string, never>;
