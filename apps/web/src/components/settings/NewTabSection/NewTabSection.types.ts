import type { NewTabPanelId } from '@/stores/useNewTabStore';

export type INewTabSectionProps = Record<string, never>;

export interface INewTabSectionView {
  readonly order: NewTabPanelId[];
  readonly hidden: Set<NewTabPanelId>;
  readonly showWatermark: boolean;
  readonly showGreetingName: boolean;
  readonly airingCount: number;
  readonly togglePanel: (id: NewTabPanelId) => void;
  readonly reorderPanels: (activeId: NewTabPanelId, overId: NewTabPanelId) => void;
  readonly setShowWatermark: (value: boolean) => void;
  readonly setShowGreetingName: (value: boolean) => void;
  readonly setAiringCount: (value: number) => void;
  readonly resetNewTab: () => void;
}
