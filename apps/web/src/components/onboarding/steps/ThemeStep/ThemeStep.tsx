import { Trans, useTranslation } from 'react-i18next';
import { Moon, Palette, Sun } from 'lucide-react';
import { darkThemes, lightThemes } from '@/lib/theme';
import { ThemeGrid } from '@/components/shared/theme/ThemeGrid';
import { StepLayout } from '../../StepLayout';
import { emPrimary, bStrong, bPrimary } from '../../shared-parts';
import { useThemeStep } from './ThemeStep.hooks';

/**
 * Step 02 · Theme picker. Dark + light groups via the shared ThemeGrid; hover
 * previews live (`setPreviewTheme`), click commits (`setTheme`).
 */
export default function ThemeStep() {
  const { t } = useTranslation('onboarding');
  const { theme, setTheme, setPreviewTheme, clearPreview } = useThemeStep();

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
