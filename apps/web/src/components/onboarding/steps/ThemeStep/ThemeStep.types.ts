import type { Theme } from '@shiroani/shared';

export interface IThemeStepView {
  readonly theme: Theme;
  readonly setTheme: (theme: Theme) => void;
  readonly setPreviewTheme: (theme: Theme | null) => void;
  readonly clearPreview: () => void;
}
