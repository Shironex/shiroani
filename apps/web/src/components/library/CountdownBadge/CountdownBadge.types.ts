export interface ICountdownBadgeProps {
  airingAt: number;
  episode: number;
}

export interface ICountdownBadgeView {
  /** Resolved badge text, or null when the episode has already aired (hide). */
  readonly label: string | null;
}
