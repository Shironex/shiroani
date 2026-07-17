import { useTranslation } from 'react-i18next';
import { useStudioBreakdown } from './StudioBreakdown.hooks';
import { StudioRows } from './StudioBreakdown.parts';
import type { IStudioBreakdownProps } from './StudioBreakdown.types';

/**
 * Ordered list of the user's most-watched studios. Each row pairs the
 * studio name with a count pill — matches the Profile mock's studio list
 * (the sibling pattern below `.side-label{Ulubione studia}`).
 */
export default function StudioBreakdown({ studios, limit = 4 }: IStudioBreakdownProps) {
  const { t, i18n } = useTranslation('profile');
  const { top } = useStudioBreakdown({ studios, limit });

  if (top.length === 0) {
    return <p className="text-xs text-muted-foreground/70">{t('studios.empty')}</p>;
  }

  return <StudioRows top={top} locale={i18n.language} />;
}
