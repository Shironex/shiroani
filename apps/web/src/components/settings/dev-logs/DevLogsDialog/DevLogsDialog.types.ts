import type { SourceMode } from '@/components/settings/dev-logs/dev-logs-utils';
import type { ILogSource } from '@/components/settings/dev-logs/useLogSource';
import type { IStickyTail } from '@/components/settings/dev-logs/useStickyTail';

export interface IDevLogsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export interface IDevLogsDialogView {
  readonly logs: ILogSource;
  readonly stickyTail: IStickyTail;
  readonly source: SourceMode;
  readonly filteredEntries: ILogSource['filteredEntries'];
  readonly fileTotalCount: number;
  readonly totalCountForHeader: number;
  readonly showTruncationNote: boolean;
}
