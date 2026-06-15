export interface IAniListErrorStateProps {
  error: string | null;
  onRetry?: () => void;
  className?: string;
}

export type IAniListErrorStateView = Record<string, never>;
