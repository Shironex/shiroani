export type StatusTone = 'green' | 'accent' | 'destructive' | 'muted';

export interface IStatusPillProps {
  tone: StatusTone;
  text: string;
}

export type IStatusPillView = Record<string, never>;
