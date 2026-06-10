import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Copy,
  Download,
  Monitor,
  Moon,
  Palette,
  Pencil,
  Plus,
  Sun,
  Type,
  Trash2,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useSettingsStore, SYSTEM_THEME } from '@/stores/useSettingsStore';
import { useCustomThemeStore } from '@/stores/useCustomThemeStore';
import { darkThemes, lightThemes, getAllThemeOptions } from '@/lib/theme';
import { removeCustomThemeCSS } from '@/lib/custom-theme-css';
import { ThemeSwatch } from '@/components/shared/theme/ThemeSwatch';
import { ThemeEditorDialog } from '@/components/settings/theme-editor/ThemeEditorDialog';
import { SettingsCard } from '@/components/settings/SettingsCard';
import { ThemeGrid } from '@/components/shared/theme/ThemeGrid';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { IS_MAC } from '@/lib/platform';
import { cn } from '@/lib/utils';
import { UI_FONT_SCALE_PRESETS, type Theme } from '@shiroani/shared';

export function ThemesSection() {
  const { t } = useTranslation('settings');
  const theme = useSettingsStore(s => s.theme);
  const uiFontScale = useSettingsStore(s => s.uiFontScale);
  const setTheme = useSettingsStore(s => s.setTheme);
  const setPreviewTheme = useSettingsStore(s => s.setPreviewTheme);
  const setUIFontScale = useSettingsStore(s => s.setUIFontScale);
  const customThemes = useCustomThemeStore(s => s.customThemes);
  const deleteTheme = useCustomThemeStore(s => s.deleteTheme);
  const exportTheme = useCustomThemeStore(s => s.exportTheme);
  const importTheme = useCustomThemeStore(s => s.importTheme);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editThemeId, setEditThemeId] = useState<string | undefined>();
  const [cloneFromTheme, setCloneFromTheme] = useState<string | undefined>();
  const [themeToDelete, setThemeToDelete] = useState<{ id: string; label: string } | null>(null);

  const handleCreateNew = useCallback(() => {
    setEditThemeId(undefined);
    setCloneFromTheme(theme);
    setEditorOpen(true);
  }, [theme]);

  const handleEditTheme = useCallback((themeId: string) => {
    setEditThemeId(themeId);
    setCloneFromTheme(undefined);
    setEditorOpen(true);
  }, []);

  const handleCloneTheme = useCallback((sourceTheme: string) => {
    setEditThemeId(undefined);
    setCloneFromTheme(sourceTheme);
    setEditorOpen(true);
  }, []);

  const requestDeleteTheme = useCallback((id: string, label: string) => {
    setThemeToDelete({ id, label });
  }, []);

  const confirmDeleteTheme = useCallback(() => {
    if (!themeToDelete) return;
    if (theme === themeToDelete.id) {
      setTheme('dark');
    }
    removeCustomThemeCSS(themeToDelete.id);
    deleteTheme(themeToDelete.id);
    toast.success(t('themes.toast.deleted'));
    setThemeToDelete(null);
  }, [themeToDelete, theme, setTheme, deleteTheme, t]);

  const customThemeOptions = getAllThemeOptions(customThemes).filter(t => t.isCustom);
  const clearPreview = useCallback(() => setPreviewTheme(null), [setPreviewTheme]);

  // Hover-reveal clone button overlay for built-in theme swatches.
  const cloneOverlay = useCallback(
    (opt: { value: Theme; label: string }) => (
      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
        <button
          onClick={e => {
            e.stopPropagation();
            handleCloneTheme(opt.value);
          }}
          className="w-6 h-6 rounded bg-background/85 backdrop-blur-sm border border-border-glass flex items-center justify-center hover:bg-accent transition-colors focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={t('themes.custom.cloneAria', { label: opt.label })}
        >
          <Copy className="w-3 h-3 text-foreground" />
        </button>
      </div>
    ),
    [handleCloneTheme, t]
  );

  return (
    <div className="space-y-4">
      <SettingsCard
        icon={Type}
        title={t('themes.readability.title')}
        subtitle={t('themes.readability.subtitle')}
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1">
            {UI_FONT_SCALE_PRESETS.map(scale => {
              const isActive = uiFontScale === scale;
              return (
                <button
                  key={scale}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setUIFontScale(scale)}
                  className={cn(
                    'rounded-lg border px-3 py-[6px] text-[12px] font-medium transition-colors',
                    'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                    isActive
                      ? 'border-primary/35 bg-primary/18 text-primary font-semibold'
                      : 'border-border-glass bg-background/30 text-muted-foreground hover:bg-accent/40 hover:text-foreground'
                  )}
                >
                  {Math.round(scale * 100)}%
                </button>
              );
            })}
          </div>
        </div>

        {IS_MAC && (
          <p className="text-[11.5px] leading-relaxed text-muted-foreground/80">
            {t('themes.readability.macHint')}
          </p>
        )}
      </SettingsCard>

      <SettingsCard
        icon={Palette}
        title={t('themes.palette.title')}
        subtitle={t('themes.palette.subtitle')}
        headerAccessory={
          <Button
            variant="outline"
            size="sm"
            className="h-7 border-border-glass px-2.5 text-[11px]"
            onClick={() => importTheme()}
          >
            <Upload className="h-3 w-3" />
            {t('themes.palette.import')}
          </Button>
        }
      >
        <button
          type="button"
          onClick={() => setTheme(SYSTEM_THEME)}
          aria-pressed={theme === SYSTEM_THEME}
          className={cn(
            'flex w-full items-center gap-3 rounded-[10px] border px-3 py-2.5 text-left transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            theme === SYSTEM_THEME
              ? 'border-primary/35 bg-primary/12'
              : 'border-border-glass bg-background/30 hover:bg-accent/40'
          )}
        >
          <span
            className={cn(
              'grid size-8 shrink-0 place-items-center rounded-lg',
              theme === SYSTEM_THEME
                ? 'bg-primary/20 text-primary'
                : 'bg-foreground/[0.06] text-muted-foreground'
            )}
          >
            <Monitor className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-[13px] font-medium text-foreground">
              {t('themes.system.title')}
            </span>
            <span className="block text-[11.5px] text-muted-foreground">
              {t('themes.system.subtitle')}
            </span>
          </span>
        </button>

        {customThemeOptions.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2.5 text-muted-foreground">
              <span className="flex items-center gap-1.5 font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em]">
                <Palette className="h-3 w-3" />
                {t('themes.custom.label')}
                <span className="tabular-nums text-muted-foreground/60">
                  · {customThemeOptions.length}
                </span>
              </span>
              <span className="h-px flex-1 bg-border-glass" />
            </div>
            <div className="grid grid-cols-5 gap-2 sm:gap-2.5">
              {customThemeOptions.map(opt => (
                <CustomThemeSwatchWrapper
                  key={opt.value}
                  option={opt}
                  isActive={theme === opt.value}
                  onSelect={setTheme}
                  onPreview={setPreviewTheme}
                  onPreviewEnd={clearPreview}
                  onEdit={() => handleEditTheme(opt.value)}
                  onDelete={() => requestDeleteTheme(opt.value, opt.label)}
                  onExport={() => exportTheme(opt.value)}
                />
              ))}
              <button
                onClick={handleCreateNew}
                aria-label={t('themes.custom.newAria')}
                className={cn(
                  'relative aspect-square w-full rounded-[10px] border border-dashed border-border-glass',
                  'grid place-items-center text-muted-foreground',
                  'transition-colors hover:bg-accent/30 hover:text-foreground',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1'
                )}
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}

        <ThemeGrid
          themes={darkThemes}
          label={t('themes.groupDark')}
          icon={Moon}
          activeTheme={theme}
          onSelect={setTheme}
          onPreview={setPreviewTheme}
          onPreviewEnd={clearPreview}
          trailingOverlay={cloneOverlay}
        />

        <ThemeGrid
          themes={lightThemes}
          label={t('themes.groupLight')}
          icon={Sun}
          activeTheme={theme}
          onSelect={setTheme}
          onPreview={setPreviewTheme}
          onPreviewEnd={clearPreview}
          trailingOverlay={cloneOverlay}
        />

        {customThemeOptions.length === 0 && (
          <div className="pt-1">
            <Button
              variant="outline"
              size="sm"
              className="border-dashed border-border-glass text-muted-foreground"
              onClick={handleCreateNew}
            >
              <Plus className="h-4 w-4" />
              {t('themes.custom.newButton')}
            </Button>
          </div>
        )}
      </SettingsCard>

      <ThemeEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        editThemeId={editThemeId}
        cloneFromTheme={cloneFromTheme}
      />

      <ConfirmDialog
        open={themeToDelete !== null}
        onOpenChange={o => !o && setThemeToDelete(null)}
        title={t('themes.deleteDialog.title')}
        description={t('themes.deleteDialog.description', { label: themeToDelete?.label ?? '' })}
        onConfirm={confirmDeleteTheme}
      />
    </div>
  );
}

function CustomThemeSwatchWrapper({
  option,
  isActive,
  onSelect,
  onPreview,
  onPreviewEnd,
  onEdit,
  onDelete,
  onExport,
}: {
  option: { value: Theme; label: string; color: string };
  isActive: boolean;
  onSelect: (theme: Theme) => void;
  onPreview: (theme: Theme) => void;
  onPreviewEnd: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onExport: () => void;
}) {
  const { t } = useTranslation('settings');
  return (
    <div className="group relative">
      <ThemeSwatch
        option={{
          value: option.value,
          label: option.label,
          color: option.color,
          testId: `${option.value}-mode-button`,
          isDark: true,
          isCustom: true,
        }}
        isActive={isActive}
        onSelect={onSelect}
        onPreview={onPreview}
        onPreviewEnd={onPreviewEnd}
      />
      <div className="absolute right-1 top-1 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        <button
          onClick={e => {
            e.stopPropagation();
            onEdit();
          }}
          className="flex h-6 w-6 items-center justify-center rounded border border-border-glass bg-background/85 backdrop-blur-sm transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={t('themes.custom.editAria')}
        >
          <Pencil className="h-3 w-3 text-foreground" />
        </button>
        <button
          onClick={e => {
            e.stopPropagation();
            onExport();
          }}
          className="flex h-6 w-6 items-center justify-center rounded border border-border-glass bg-background/85 backdrop-blur-sm transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={t('themes.custom.exportAria')}
        >
          <Download className="h-3 w-3 text-foreground" />
        </button>
        <button
          onClick={e => {
            e.stopPropagation();
            onDelete();
          }}
          className="flex h-6 w-6 items-center justify-center rounded border border-border-glass bg-background/85 backdrop-blur-sm transition-colors hover:bg-destructive/20 focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={t('themes.custom.deleteAria')}
        >
          <Trash2 className="h-3 w-3 text-destructive" />
        </button>
      </div>
    </div>
  );
}
