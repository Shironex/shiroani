import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { ThemeOption } from '@/lib/theme';
import type { Theme } from '@shiroani/shared';

export interface IThemeGridProps {
  themes: readonly ThemeOption[];
  label: string;
  icon?: LucideIcon;
  activeTheme: Theme;
  onSelect: (theme: Theme) => void;
  onPreview: (theme: Theme) => void;
  onPreviewEnd: () => void;
  /** Optional trailing content in the header row (e.g. count badge, buttons). */
  action?: ReactNode;
  /**
   * Optional hover-reveal overlay rendered on top of every swatch. Used by the
   * settings variant to surface a clone affordance per-tile while keeping the
   * onboarding variant slim.
   */
  trailingOverlay?: (option: ThemeOption) => ReactNode;
  className?: string;
}

export type IThemeGridView = Record<string, never>;
