import type { IVariableGroup } from '@/components/settings/theme-editor/theme-variable-groups';

export interface IThemeVariableFieldProps {
  varName: string;
  group: IVariableGroup;
  value: string;
  onChange: (value: string) => void;
}

export type IThemeVariableFieldView = Record<string, never>;
