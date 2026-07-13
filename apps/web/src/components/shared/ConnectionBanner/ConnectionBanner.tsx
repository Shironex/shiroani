import { Loader2, WifiOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useConnectionBanner } from './ConnectionBanner.hooks';

export default function ConnectionBanner() {
  const { t } = useTranslation('nav');
  const { status, retryConnection } = useConnectionBanner();

  if (status === 'connected') return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="animate-slide-down relative z-[1] flex items-center justify-center gap-2 border-b border-status-warning/25 bg-status-warning-bg px-3 py-1.5 text-xs text-status-warning backdrop-blur-md"
    >
      {status === 'reconnecting' ? (
        <>
          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          <span>{t('connection.reconnecting')}</span>
        </>
      ) : (
        <>
          <WifiOff className="size-3.5" aria-hidden="true" />
          <span>{t('connection.offline')}</span>
          <button
            type="button"
            onClick={retryConnection}
            className="ml-1 rounded px-1.5 py-0.5 font-medium text-status-warning underline underline-offset-2 transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-status-warning"
          >
            {t('connection.retry')}
          </button>
        </>
      )}
    </div>
  );
}
