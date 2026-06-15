import type { LogEntry } from '@shiroani/shared';

export interface ILogEntryRowProps {
  entry: LogEntry;
  expanded: boolean;
  onToggle: () => void;
}

export type ILogEntryRowView = Record<string, never>;
