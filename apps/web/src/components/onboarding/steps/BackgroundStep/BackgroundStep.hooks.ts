import { useTranslation } from 'react-i18next';
import type { IBackgroundStepView } from './BackgroundStep.types';

export function useBackgroundStep(): IBackgroundStepView {
  const { t } = useTranslation('onboarding');
  return { stepTitle: t('step.background.title') };
}
