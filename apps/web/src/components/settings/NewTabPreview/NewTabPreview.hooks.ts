import { useNewTabStore } from '@/stores/useNewTabStore';
import type { INewTabPreviewProps, INewTabPreviewView } from './NewTabPreview.types';

export function useNewTabPreview(_props?: INewTabPreviewProps): INewTabPreviewView {
  const order = useNewTabStore(s => s.order);
  const hiddenPanels = useNewTabStore(s => s.hiddenPanels);
  const showWatermark = useNewTabStore(s => s.showWatermark);
  const showGreetingName = useNewTabStore(s => s.showGreetingName);
  const airingCount = useNewTabStore(s => s.airingCount);

  return { order, hiddenPanels, showWatermark, showGreetingName, airingCount };
}
