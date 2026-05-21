import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { FeedCategory, FeedLanguage } from '@shiroani/shared';

/**
 * Translated category labels. Hook-form so callers re-render on language
 * change without each component repeating the same `t('category.*')`
 * boilerplate.
 */
export function useCategoryLabels(): Record<FeedCategory | 'all', string> {
  const { t } = useTranslation('feed');
  return useMemo(
    () => ({
      all: t('category.all'),
      news: t('category.news'),
      episodes: t('category.episodes'),
      reviews: t('category.reviews'),
      community: t('category.community'),
    }),
    [t]
  );
}

export function useLanguageLabels(): Record<FeedLanguage | 'all', string> {
  const { t } = useTranslation('feed');
  return useMemo(
    () => ({
      all: t('languageLabel.all'),
      en: t('languageLabel.en'),
      pl: t('languageLabel.pl'),
    }),
    [t]
  );
}
