import type { AiringAnime } from '@shiroani/shared';

export interface ITimetableViewProps {
  weekDays: string[];
  getEntriesForDay: (day: string) => AiringAnime[];
  /** Raw schedule object so useMemo can detect changes */
  schedule: Record<string, AiringAnime[]>;
  onAnimeClick?: (anime: AiringAnime) => void;
}

export interface ITimetableViewView {
  dayNamesShort: string[];
  weekData: Map<string, AiringAnime[]>;
  now: number;
}
