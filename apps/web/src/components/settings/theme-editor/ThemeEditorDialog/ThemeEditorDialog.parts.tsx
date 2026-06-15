import { ThemeVariableField } from '@/components/settings/theme-editor/ThemeVariableField';
import type { ILabeledVariableGroup } from './ThemeEditorDialog.types';

interface ThemeGroupSectionProps {
  group: ILabeledVariableGroup;
  variables: Record<string, string>;
  onVariableChange: (varName: string, value: string) => void;
}

/** One labeled section of theme variables (e.g. "Main", "Borders"). */
export function ThemeGroupSection({ group, variables, onVariableChange }: ThemeGroupSectionProps) {
  return (
    <div>
      <h4 className="text-xs font-medium text-primary mb-2">{group.label}</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
        {group.variables.map(varName => (
          <ThemeVariableField
            key={varName}
            varName={varName}
            group={group}
            value={variables[varName] || ''}
            onChange={val => onVariableChange(varName, val)}
          />
        ))}
      </div>
    </div>
  );
}
