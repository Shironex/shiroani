import type { Dispatch, SetStateAction } from 'react';
import type { BuiltInTheme } from '@shiroani/shared';
import type { IVariableGroup } from '@/components/settings/theme-editor/theme-variable-groups';

export interface IThemeEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editThemeId?: string;
  cloneFromTheme?: string;
}

/** A `IVariableGroup` with its resolved (translated) label attached. */
export type ILabeledVariableGroup = IVariableGroup & { label: string };

export interface IThemeEditorDialogView {
  readonly name: string;
  readonly setName: Dispatch<SetStateAction<string>>;
  readonly isDark: boolean;
  readonly setIsDark: Dispatch<SetStateAction<boolean>>;
  readonly baseTheme: BuiltInTheme;
  readonly variables: Record<string, string>;
  readonly variableGroups: ILabeledVariableGroup[];
  readonly handleVariableChange: (varName: string, value: string) => void;
  readonly handleBaseThemeChange: (newBase: string) => void;
  readonly handleReset: () => void;
  readonly handleCancel: () => void;
  readonly handleSave: () => void;
  readonly isEditing: boolean;
  readonly dialogTitle: string;
}
