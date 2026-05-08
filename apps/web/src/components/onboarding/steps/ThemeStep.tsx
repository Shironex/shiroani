import { useCallback } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Moon, Palette, Sun } from 'lucide-react';
import { StepLayout } from '../StepLayout';
import { darkThemes, lightThemes } from '@/lib/theme';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { ThemeGrid } from '@/components/shared/theme/ThemeGrid';

/**
 * Step 02 · Theme picker.
 *
 * Renders dark + light groups using the shared ThemeGrid primitive. Hover
 * previews the theme live via `setPreviewTheme`; click commits via `setTheme`.
 */
export function ThemeStep() {
  const { t } = useTranslation('onboarding');
  const { theme, setTheme, setPreviewTheme } = useSettingsStore();
  const clearPreview = useCallback(() => setPreviewTheme(null), [setPreviewTheme]);

  const emPrimary = <em className="not-italic text-primary italic" />;
  const bStrong = <b className="font-semibold text-foreground" />;
  const bPrimary = <b className="font-bold text-primary" />;

  return (
    <StepLayout
      kanji="色"
      headline={
        <Trans ns="onboarding" i18nKey="step.theme.headline" components={{ 1: emPrimary }} />
      }
      description={
        <Trans ns="onboarding" i18nKey="step.theme.description" components={{ 1: bStrong }} />
      }
      stepMarker={
        <Trans ns="onboarding" i18nKey="step.theme.marker" components={{ 1: bPrimary }} />
      }
      stepIcon={<Palette className="h-5 w-5" />}
      stepTitle={t('step.theme.title')}
    >
      <ThemeGrid
        themes={darkThemes}
        label={t('step.theme.groupDark')}
        icon={Moon}
        activeTheme={theme}
        onSelect={setTheme}
        onPreview={setPreviewTheme}
        onPreviewEnd={clearPreview}
      />
      <ThemeGrid
        themes={lightThemes}
        label={t('step.theme.groupLight')}
        icon={Sun}
        activeTheme={theme}
        onSelect={setTheme}
        onPreview={setPreviewTheme}
        onPreviewEnd={clearPreview}
      />
    </StepLayout>
  );
}
