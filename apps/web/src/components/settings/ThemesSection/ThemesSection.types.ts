import type { Theme } from '@shiroani/shared';
import type { ThemeOption } from '@/lib/theme';

export type IThemesSectionProps = Record<string, never>;

export interface IThemeToDelete {
  id: string;
  label: string;
}

export interface IThemesSectionView {
  readonly theme: Theme;
  readonly uiFontScale: number;
  readonly setTheme: (theme: Theme) => void;
  readonly setPreviewTheme: (theme: Theme | null) => void;
  readonly setUIFontScale: (scale: number) => void;
  readonly customThemeOptions: ThemeOption[];
  readonly editorOpen: boolean;
  readonly setEditorOpen: (open: boolean) => void;
  readonly editThemeId: string | undefined;
  readonly cloneFromTheme: string | undefined;
  readonly themeToDelete: IThemeToDelete | null;
  readonly setThemeToDelete: (value: IThemeToDelete | null) => void;
  readonly handleCreateNew: () => void;
  readonly handleEditTheme: (themeId: string) => void;
  readonly handleCloneTheme: (sourceTheme: string) => void;
  readonly requestDeleteTheme: (id: string, label: string) => void;
  readonly confirmDeleteTheme: () => void;
  readonly clearPreview: () => void;
  readonly importTheme: () => Promise<void>;
  readonly exportTheme: (id: string) => Promise<void>;
}
