import { useMemo } from 'react';
import { useNewTabStore } from '@/stores/useNewTabStore';
import type { INewTabSectionProps, INewTabSectionView } from './NewTabSection.types';

export function useNewTabSection(_props?: INewTabSectionProps): INewTabSectionView {
  const order = useNewTabStore(s => s.order);
  const hiddenPanels = useNewTabStore(s => s.hiddenPanels);
  const showWatermark = useNewTabStore(s => s.showWatermark);
  const showGreetingName = useNewTabStore(s => s.showGreetingName);
  const airingCount = useNewTabStore(s => s.airingCount);
  const togglePanel = useNewTabStore(s => s.togglePanel);
  const reorderPanels = useNewTabStore(s => s.reorderPanels);
  const setShowWatermark = useNewTabStore(s => s.setShowWatermark);
  const setShowGreetingName = useNewTabStore(s => s.setShowGreetingName);
  const setAiringCount = useNewTabStore(s => s.setAiringCount);
  const resetNewTab = useNewTabStore(s => s.resetNewTab);

  const hidden = useMemo(() => new Set(hiddenPanels), [hiddenPanels]);

  return {
    order,
    hidden,
    showWatermark,
    showGreetingName,
    airingCount,
    togglePanel,
    reorderPanels,
    setShowWatermark,
    setShowGreetingName,
    setAiringCount,
    resetNewTab,
  };
}
