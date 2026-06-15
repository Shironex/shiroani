import type { ILogSource } from '@/components/settings/dev-logs/useLogSource';

export interface IDevLogsToolbarProps {
  logs: ILogSource;
}

export type IDevLogsToolbarView = Record<string, never>;
