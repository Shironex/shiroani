import type { ThemeOption } from '@/lib/theme';
import type { IThemeSwatchView } from './ThemeSwatch.types';

export function useThemeSwatch(option: ThemeOption): IThemeSwatchView {
  const bg = option.isDark ? 'oklch(0.12 0.018 300)' : 'oklch(0.97 0.008 80)';
  const labelColor = option.isDark ? 'rgba(255,255,255,0.92)' : 'rgba(20, 14, 30, 0.85)';
  return { bg, labelColor };
}
