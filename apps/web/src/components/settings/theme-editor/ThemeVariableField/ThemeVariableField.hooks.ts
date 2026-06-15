import type { IThemeVariableFieldView } from './ThemeVariableField.types';

/**
 * The field is fully presentational — it derives everything from props. The
 * factory exists to satisfy the component-folder convention and exposes no
 * view-model.
 */
export function useThemeVariableField(): IThemeVariableFieldView {
  return {};
}
