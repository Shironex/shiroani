import type { FrequentSite } from '@shiroani/shared';

export interface IRecentsPanelProps {
  frequentSites: FrequentSite[];
  onNavigate: (url: string) => void;
}

export type IRecentsPanelView = Record<string, never>;
