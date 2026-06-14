import type { QuickAccessSite } from '@shiroani/shared';

export interface IQuickAccessPanelProps {
  sites: QuickAccessSite[];
  hiddenPredefined: QuickAccessSite[];
  onNavigate: (url: string) => void;
  onRemove: (site: QuickAccessSite) => void;
  onAdd: () => void;
  onShowPredefined: (id: string) => void;
}

export type IQuickAccessPanelView = Record<string, never>;
