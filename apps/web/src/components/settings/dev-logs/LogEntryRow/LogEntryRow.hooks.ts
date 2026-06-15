import type { ILogEntryRowView } from './LogEntryRow.types';

/**
 * The row is presentational — its only derived value (`hasData`) is a cheap
 * shell-side const. The factory exists to satisfy the component-folder
 * convention and exposes no view-model.
 */
export function useLogEntryRow(): ILogEntryRowView {
  return {};
}
