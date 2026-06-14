import { type CSSProperties } from 'react';
import type { AiringAnime } from '@shiroani/shared';
import type { SlotStatus } from '../schedule-utils';

export interface IAiringEntryProps {
  anime: AiringAnime;
  /** `done` (past), `live` (now ±30m), `soon` (future) */
  status: SlotStatus;
  /** Current unix timestamp — passed in so all slots share one clock tick */
  now: number;
  /** Optional absolute-positioning overrides (used by DailyView timeline) */
  style?: CSSProperties;
  onClick?: (anime: AiringAnime) => void;
}

export type IAiringEntryView = Record<string, never>;
