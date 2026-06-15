import type { Dispatch, SetStateAction } from 'react';
import type { AppStatsSnapshot } from '@shiroani/shared';

export type IInAppStatsPanelProps = Record<string, never>;

export interface IInAppStatsPanelView {
  readonly snapshot: AppStatsSnapshot;
  readonly hero: { primary: string; secondary: string };
  readonly totals: AppStatsSnapshot['totals'];
  readonly daysLabel: string;
  readonly sessionsLabel: string;
  readonly resetOpen: boolean;
  readonly setResetOpen: Dispatch<SetStateAction<boolean>>;
  readonly handleReset: () => void;
}
