import { Input } from '@/components/ui/input';
import { ColorPickerField } from '@/components/settings/ColorPickerField';
import { THEME_VARIABLE_NAMES } from '@/lib/custom-theme-css';
import {
  isColorVariable,
  variableLabel,
  type VariableGroup,
} from '@/components/settings/theme-editor/theme-variable-groups';

interface ThemeVariableFieldProps {
  varName: string;
  group: VariableGroup;
  value: string;
  onChange: (value: string) => void;
}

/**
 * A single editable theme variable: a color picker for color variables, or a
 * mono text input for shadow strings. Renders nothing for variables not present
 * in `THEME_VARIABLE_NAMES`.
 */
export function ThemeVariableField({ varName, group, value, onChange }: ThemeVariableFieldProps) {
  if (!(THEME_VARIABLE_NAMES as readonly string[]).includes(varName)) return null;

  if (isColorVariable(varName, group)) {
    return (
      <ColorPickerField
        label={variableLabel(varName)}
        variableName={varName}
        value={value}
        onChange={onChange}
      />
    );
  }

  const inputId = `theme-var-${varName}`;

  return (
    <div className="flex flex-col gap-0.5">
      <label htmlFor={inputId} className="text-2xs text-foreground">
        {variableLabel(varName)}
      </label>
      <Input
        id={inputId}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="h-6 px-1.5 text-2xs font-mono"
        placeholder={`--${varName}`}
      />
    </div>
  );
}
