import { useLogSource } from '@/components/settings/dev-logs/useLogSource';
import { useStickyTail } from '@/components/settings/dev-logs/useStickyTail';
import type { IDevLogsDialogView } from './DevLogsDialog.types';

/**
 * Wires the dev-logs dialog to its data layer (`useLogSource`) and the
 * tail-following behavior (`useStickyTail`), exposing the derived slices the
 * shell renders.
 */
export function useDevLogsDialog({ open }: { open: boolean }): IDevLogsDialogView {
  const logs = useLogSource({ open });
  const stickyTail = useStickyTail({
    tailTrigger: logs.filteredEntries,
    paused: logs.paused,
    resetSignal: logs.resetSignal,
  });

  const { source, filteredEntries, fileTotalCount, totalCountForHeader, showTruncationNote } = logs;

  return {
    logs,
    stickyTail,
    source,
    filteredEntries,
    fileTotalCount,
    totalCountForHeader,
    showTruncationNote,
  };
}
