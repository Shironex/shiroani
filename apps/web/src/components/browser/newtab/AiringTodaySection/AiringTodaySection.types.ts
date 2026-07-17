import type { AiringAnime } from '@shiroani/shared';

export type AiringCard = AiringAnime & { isUser: boolean };

export interface IAiringTodaySectionProps {
  maxCards: number;
}

export interface IAiringTodaySectionView {
  readonly todayEntries: AiringAnime[] | undefined;
  readonly isLoading: boolean;
  readonly navigateToSchedule: () => void;
  readonly cards: AiringCard[];
}

export interface IAiringPosterCardProps {
  entry: AiringAnime;
  isUser?: boolean;
}
