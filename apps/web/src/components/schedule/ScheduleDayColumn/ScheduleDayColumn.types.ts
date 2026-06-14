import type { ReactNode } from 'react';
import type { AiringAnime } from '@shiroani/shared';
import type { SlotStatus } from '../schedule-utils';

export interface IScheduleDayColumnProps {
  /** YYYY-MM-DD — drives the "is today" tint + header. */
  day: string;
  /** Short day label shown in the header (e.g. "PON"). */
  label: string;
  /** Airing entries for this day, already sorted by the caller. */
  entries: AiringAnime[];
  /** Current epoch seconds — used to derive each entry's slot status. */
  now: number;
  /** Renders a single card. Receives the entry + its live/soon/done status. */
  renderCard: (anime: AiringAnime, status: SlotStatus) => ReactNode;
  /** Copy shown inside the empty-state when the day has no entries. */
  emptyLabel: string;
  /** Tailwind class for vertical spacing between cards (e.g. "space-y-1.5"). */
  listClassName?: string;
  /** Extra classes for the empty-state wrapper — controls vertical padding. */
  emptyStateClassName?: string;
  /** Icon-size class for the empty-state `Calendar` glyph. */
  emptyIconClassName?: string;
}

export type IScheduleDayColumnView = Record<string, never>;
