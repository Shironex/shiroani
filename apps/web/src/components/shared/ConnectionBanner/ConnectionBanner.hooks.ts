import { useConnectionStore } from '@/stores/useConnectionStore';
import type { IConnectionBannerView } from './ConnectionBanner.types';

export function useConnectionBanner(): IConnectionBannerView {
  const status = useConnectionStore(s => s.status);
  const retryConnection = useConnectionStore(s => s.retryConnection);
  return { status, retryConnection };
}
