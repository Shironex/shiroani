import type { QuickAccessSite, FrequentSite } from '@shiroani/shared';
import type { NewTabPanelId } from '@/stores/useNewTabStore';

export interface INewTabPageProps {
  onNavigate: (url: string) => void;
}

export interface INewTabPageView {
  readonly sites: QuickAccessSite[];
  readonly hiddenPredefined: QuickAccessSite[];
  readonly frequentSites: FrequentSite[];
  readonly hiddenPanels: NewTabPanelId[];
  readonly panelOrder: NewTabPanelId[];
  readonly showWatermark: boolean;
  readonly showGreetingName: boolean;
  readonly airingCount: number;
  readonly isAddDialogOpen: boolean;
  readonly setIsAddDialogOpen: (open: boolean) => void;
  readonly newSiteName: string;
  readonly setNewSiteName: (value: string) => void;
  readonly newSiteUrl: string;
  readonly setNewSiteUrl: (value: string) => void;
  readonly handleAddSite: () => void;
  readonly handleRemoveSite: (site: QuickAccessSite) => void;
  readonly showPredefined: (id: string) => void;
}

export interface INewTabPanelsProps {
  panelOrder: NewTabPanelId[];
  hiddenPanels: NewTabPanelId[];
  showGreetingName: boolean;
  airingCount: number;
  sites: QuickAccessSite[];
  hiddenPredefined: QuickAccessSite[];
  frequentSites: FrequentSite[];
  onNavigate: (url: string) => void;
  onRemoveSite: (site: QuickAccessSite) => void;
  onAddSite: () => void;
  onShowPredefined: (id: string) => void;
}
