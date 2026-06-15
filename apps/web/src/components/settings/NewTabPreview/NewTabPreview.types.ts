import type { ReactNode } from 'react';
import type { NewTabPanelId } from '@/stores/useNewTabStore';

export interface INewTabPreviewProps {
  /** Optional uppercase caption rendered above the stage (e.g. "Podgląd"). */
  label?: ReactNode;
}

export interface INewTabPreviewView {
  readonly order: NewTabPanelId[];
  readonly hiddenPanels: NewTabPanelId[];
  readonly showWatermark: boolean;
  readonly showGreetingName: boolean;
  readonly airingCount: number;
}
