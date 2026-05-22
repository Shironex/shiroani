export interface VariableGroup {
  /** i18n key for the group label, resolved against `settings:themes.editor.groups.*` */
  labelKey: 'main' | 'cardsMenus' | 'sidebar' | 'borders' | 'statuses' | 'shadows';
  variables: string[];
  /** If true, variables are box-shadow strings — use text input instead of color picker */
  isTextOnly?: boolean;
  /** Individual variables that are colors even in a text-only group */
  colorOverrides?: string[];
}

export const VARIABLE_GROUPS: VariableGroup[] = [
  {
    labelKey: 'main',
    variables: [
      'background',
      'background-80',
      'foreground',
      'primary',
      'primary-foreground',
      'brand-600',
    ],
  },
  {
    labelKey: 'cardsMenus',
    variables: [
      'card',
      'card-foreground',
      'popover',
      'popover-foreground',
      'secondary',
      'secondary-foreground',
      'muted',
      'muted-foreground',
      'accent',
      'accent-foreground',
      'destructive',
    ],
  },
  {
    labelKey: 'sidebar',
    variables: ['sidebar', 'sidebar-foreground'],
  },
  {
    labelKey: 'borders',
    variables: ['border', 'border-glass', 'input', 'ring'],
  },
  {
    labelKey: 'statuses',
    variables: [
      'status-success',
      'status-success-bg',
      'status-warning',
      'status-warning-bg',
      'status-error',
      'status-error-bg',
      'status-info',
      'status-info-bg',
      'status-pending',
      'status-pending-bg',
    ],
  },
  {
    labelKey: 'shadows',
    variables: [
      'shadow-xs',
      'shadow-sm',
      'shadow-md',
      'shadow-lg',
      'shadow-xl',
      'shadow-card-focused',
    ],
    isTextOnly: true,
  },
];

/** Sentinel theme id used to inject the live preview CSS while editing. */
export const TEMP_THEME_ID = '__theme-editor-preview__';

/** Human-readable label for a CSS variable name. */
export function variableLabel(name: string): string {
  return name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/** Check whether a variable should use the color picker (not a shadow string). */
export function isColorVariable(varName: string, group: VariableGroup): boolean {
  if (!group.isTextOnly) return true;
  if (group.colorOverrides?.includes(varName)) return true;
  return false;
}
