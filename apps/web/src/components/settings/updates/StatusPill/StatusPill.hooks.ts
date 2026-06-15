import type { IStatusPillView } from './StatusPill.types';

/**
 * The status pill is presentational — its tone→class lookups are plain
 * object-index consts kept in the shell. The factory exists to satisfy the
 * component-folder convention and exposes no view-model.
 */
export function useStatusPill(): IStatusPillView {
  return {};
}
