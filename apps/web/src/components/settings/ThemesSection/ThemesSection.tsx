import { useTranslation } from 'react-i18next';
import { Copy, Monitor, Moon, Palette, Plus, Sun, Type, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SYSTEM_THEME } from '@/stores/useSettingsStore';
import { darkThemes, lightThemes } from '@/lib/theme';
import { ThemeEditorDialog } from '@/components/settings/theme-editor/ThemeEditorDialog';
import { SettingsCard } from '@/components/settings/SettingsCard';
import { ThemeGrid } from '@/components/shared/theme/ThemeGrid';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { IS_MAC } from '@/lib/platform';
import { cn } from '@/lib/utils';
import { selectableChip } from '@/components/settings/chip-styles';
import { SelectableChipButton } from '@/components/settings/SelectableChipButton';
import { UI_FONT_SCALE_PRESETS, type Theme } from '@shiroani/shared';
import { useThemesSection } from './ThemesSection.hooks';
import { CustomThemeSwatchWrapper } from './ThemesSection.parts';
import type { IThemesSectionProps } from './ThemesSection.types';

export default function ThemesSection(props: IThemesSectionProps) {
  const { t } = useTranslation('settings');
  const {
    theme,
    uiFontScale,
    setTheme,
    setPreviewTheme,
    setUIFontScale,
    customThemeOptions,
    editorOpen,
    setEditorOpen,
    editThemeId,
    cloneFromTheme,
    themeToDelete,
    setThemeToDelete,
    handleCreateNew,
    handleEditTheme,
    handleCloneTheme,
    requestDeleteTheme,
    confirmDeleteTheme,
    clearPreview,
    importTheme,
    exportTheme,
  } = useThemesSection(props);

  // Hover-reveal clone button overlay for built-in theme swatches.
  const cloneOverlay = (opt: { value: Theme; label: string }) => (
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
  );

  const fontScaleButtons = UI_FONT_SCALE_PRESETS.map(scale => {
    const isActive = uiFontScale === scale;
    const percentLabel = Math.round(scale * 100);
    return (
      <SelectableChipButton
        key={scale}
        active={isActive}
        onClick={() => setUIFontScale(scale)}
        className="py-[6px] text-[12px]"
      >
        {percentLabel}%
      </SelectableChipButton>
    );
  });

  const customSwatches = customThemeOptions.map(opt => (
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
  ));

  return (
    <div className="space-y-4">
      <SettingsCard
        icon={Type}
        title={t('themes.readability.title')}
        subtitle={t('themes.readability.subtitle')}
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1">{fontScaleButtons}</div>
        </div>

        {IS_MAC && (
          <p className="text-[11.5px] leading-relaxed text-muted-foreground/85">
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
            'flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            selectableChip(theme === SYSTEM_THEME)
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
              <span className="flex items-center gap-1.5 font-mono text-2xs font-semibold uppercase tracking-[0.18em]">
                <Palette className="h-3 w-3" />
                {t('themes.custom.label')}
                <span className="tabular-nums text-muted-foreground/80">
                  · {customThemeOptions.length}
                </span>
              </span>
              <span className="h-px flex-1 bg-border-glass" />
            </div>
            <div className="grid grid-cols-5 gap-2 sm:gap-2.5">
              {customSwatches}
              <button
                onClick={handleCreateNew}
                aria-label={t('themes.custom.newAria')}
                className={cn(
                  'relative aspect-square w-full rounded-lg border border-dashed border-border-glass',
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
