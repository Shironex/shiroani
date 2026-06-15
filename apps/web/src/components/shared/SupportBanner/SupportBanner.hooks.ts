import { useCallback } from 'react';
import { BUY_ME_A_COFFEE_URL, GITHUB_SPONSORS_URL } from '@/lib/constants';
import { useSupportBannerStore } from '@/stores/useSupportBannerStore';
import type { ISupportBannerView } from './SupportBanner.types';

export function useSupportBanner(): ISupportBannerView {
  const seen = useSupportBannerStore(s => s.seen);
  const setSeen = useSupportBannerStore(s => s.setSeen);

  const openCoffeeLink = useCallback(() => {
    window.open(BUY_ME_A_COFFEE_URL, '_blank', 'noopener,noreferrer');
    setSeen();
  }, [setSeen]);

  const openSponsorsLink = useCallback(() => {
    window.open(GITHUB_SPONSORS_URL, '_blank', 'noopener,noreferrer');
    setSeen();
  }, [setSeen]);

  return { seen, setSeen, openCoffeeLink, openSponsorsLink };
}
