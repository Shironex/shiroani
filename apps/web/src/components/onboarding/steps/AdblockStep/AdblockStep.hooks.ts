import { useBrowserStore } from '@/stores/useBrowserStore';
import type { IAdblockStepView } from './AdblockStep.types';

/** Reads + toggles the built-in browser's EasyList/EasyPrivacy adblock flag. */
export function useAdblockStep(): IAdblockStepView {
  const adblockEnabled = useBrowserStore(s => s.adblockEnabled);
  const setAdblockEnabled = useBrowserStore(s => s.setAdblockEnabled);
  return { adblockEnabled, setAdblockEnabled };
}
