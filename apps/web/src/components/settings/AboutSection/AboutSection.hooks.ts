import { useOnboardingStore } from '@/stores/useOnboardingStore';
import { useAppVersion } from '@/hooks/useAppVersion';
import type { IAboutSectionProps, IAboutSectionView } from './AboutSection.types';

export function useAboutSection(_props?: IAboutSectionProps): IAboutSectionView {
  const version = useAppVersion('');
  const resetOnboarding = useOnboardingStore(s => s.reset);

  return { version, resetOnboarding };
}
