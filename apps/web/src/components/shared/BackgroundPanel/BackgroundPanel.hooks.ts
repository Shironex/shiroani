import { useBackgroundStore } from '@/stores/useBackgroundStore';
import type { IBackgroundPanelView } from './BackgroundPanel.types';

export function useBackgroundPanel(): IBackgroundPanelView {
  const customBackground = useBackgroundStore(s => s.customBackground);
  const backgroundOpacity = useBackgroundStore(s => s.backgroundOpacity);
  const backgroundBlur = useBackgroundStore(s => s.backgroundBlur);
  const backgroundDim = useBackgroundStore(s => s.backgroundDim);
  const pickBackground = useBackgroundStore(s => s.pickBackground);
  const removeBackground = useBackgroundStore(s => s.removeBackground);
  const setBackgroundOpacity = useBackgroundStore(s => s.setBackgroundOpacity);
  const setBackgroundBlur = useBackgroundStore(s => s.setBackgroundBlur);
  const setBackgroundDim = useBackgroundStore(s => s.setBackgroundDim);

  return {
    customBackground,
    backgroundOpacity,
    backgroundBlur,
    backgroundDim,
    pickBackground,
    removeBackground,
    setBackgroundOpacity,
    setBackgroundBlur,
    setBackgroundDim,
  };
}
