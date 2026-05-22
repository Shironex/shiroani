import { Coffee, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BUY_ME_A_COFFEE_URL } from '@/lib/constants';
import { useSupportBannerStore } from '@/stores/useSupportBannerStore';

export function SupportBanner() {
  const { t } = useTranslation('nav');
  const seen = useSupportBannerStore(s => s.seen);
  const setSeen = useSupportBannerStore(s => s.setSeen);

  if (seen) return null;

  const openCoffeeLink = () => {
    window.open(BUY_ME_A_COFFEE_URL, '_blank', 'noopener,noreferrer');
    setSeen();
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="animate-slide-down relative z-[1] flex items-center justify-center gap-2 border-b border-border-glass bg-card/90 px-3 py-1.5 text-xs text-foreground backdrop-blur-md"
    >
      <Coffee className="size-3.5 text-primary" aria-hidden="true" />
      <span>{t('supportBanner.message')}</span>
      <button
        type="button"
        onClick={openCoffeeLink}
        className="ml-1 rounded px-1.5 py-0.5 font-medium text-primary underline underline-offset-2 transition-opacity hover:opacity-80"
      >
        {t('supportBanner.action')}
      </button>
      <button
        type="button"
        onClick={setSeen}
        aria-label={t('supportBanner.dismiss')}
        className="ml-1 grid place-items-center rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
      >
        <X className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}
