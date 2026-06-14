import { useSettingsStore } from '@/stores/useSettingsStore';
import type { INameStepView } from './NameStep.types';

export function useNameStep(): INameStepView {
  const displayName = useSettingsStore(s => s.displayName);
  const setDisplayName = useSettingsStore(s => s.setDisplayName);
  return { displayName, setDisplayName };
}
