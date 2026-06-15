import type { ISettingsCardView } from './SettingsCard.types';

/**
 * The settings primitives are presentational — their only hooks are `useId`
 * (render-safe, kept in the shell). The factory exists to satisfy the
 * component-folder convention and exposes no view-model.
 */
export function useSettingsCard(): ISettingsCardView {
  return {};
}
