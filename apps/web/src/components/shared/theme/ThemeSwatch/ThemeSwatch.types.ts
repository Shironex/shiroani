import type { ThemeOption } from '@/lib/theme';
import type { Theme } from '@shiroani/shared';

export interface IThemeSwatchProps {
  option: ThemeOption;
  isActive: boolean;
  onSelect: (theme: Theme) => void;
  onPreview: (theme: Theme) => void;
  onPreviewEnd: () => void;
}

export interface IThemeSwatchView {
  readonly bg: string;
  readonly labelColor: string;
}
