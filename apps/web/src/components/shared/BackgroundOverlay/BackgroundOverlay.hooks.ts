import { useBackgroundStore } from '@/stores/useBackgroundStore';
import type { IBackgroundOverlayView } from './BackgroundOverlay.types';

export function useBackgroundOverlay(): IBackgroundOverlayView {
  const backgroundOpacity = useBackgroundStore(s => s.backgroundOpacity);
  return { backgroundOpacity };
}
