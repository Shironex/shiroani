import { useTranslation } from 'react-i18next';
import type { IComingSoonPlaceholderView } from './ComingSoonPlaceholder.types';

interface IUseComingSoonPlaceholderArgs {
  tag?: string;
}

export function useComingSoonPlaceholder({
  tag,
}: IUseComingSoonPlaceholderArgs): IComingSoonPlaceholderView {
  const { t } = useTranslation('nav');
  const finalTag = tag ?? t('comingSoon.tag');
  return { finalTag };
}
