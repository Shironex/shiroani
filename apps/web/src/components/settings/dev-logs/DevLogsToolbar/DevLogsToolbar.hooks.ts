import type { IDevLogsToolbarView } from './DevLogsToolbar.types';

/**
 * The toolbar is presentational — all behavior lives in the `logs` prop
 * (a `ILogSource`). The factory exists to satisfy the component-folder
 * convention and exposes no view-model.
 */
export function useDevLogsToolbar(): IDevLogsToolbarView {
  return {};
}
