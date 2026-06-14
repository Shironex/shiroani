import { useTranslation } from 'react-i18next';
import type { ISplashFooterProps, ISplashFooterView } from './SplashFooter.types';

export function useSplashFooter({
  variant = 'loading',
  statusText,
  version,
  metaRight,
  error,
}: Pick<
  ISplashFooterProps,
  'variant' | 'statusText' | 'version' | 'metaRight' | 'error'
>): ISplashFooterView {
  const { t } = useTranslation('splash');
  const isError = variant === 'error' || Boolean(error);
  const isUpdating = variant === 'updating';
  const showProgress = !isError;
  const progressTone: 'primary' | 'info' = isUpdating ? 'info' : 'primary';

  // Render the structured status row when provided, else fall back to the
  // rotating-prose mode used by the original loading splash.
  const structured = Boolean(statusText) && !isError;
  const statusAction = structured ? (statusText?.action ?? null) : null;
  const statusTarget = structured ? (statusText?.target ?? null) : null;

  const metaText = metaRight ?? (version ? `v${version}` : null);

  return {
    isError,
    showProgress,
    progressTone,
    structured,
    statusAction,
    statusTarget,
    metaText,
    closeLabel: t('error.close'),
    retryLabel: t('error.retry'),
  };
}
