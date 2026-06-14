import { useTranslation } from 'react-i18next';
import { MOOD_EMOJI, MOOD_OPTIONS } from '@/lib/diary-constants';
import { tDynamic } from '@/lib/i18n';
import type { IMoodOption, IMoodPickerPillsView } from './MoodPickerPills.types';

export function useMoodPickerPills(): IMoodPickerPillsView {
  const { i18n } = useTranslation('diary');
  const options: IMoodOption[] = MOOD_OPTIONS.map(opt => ({
    value: opt.value,
    label: tDynamic(i18n, `diary:${opt.labelKey}`),
    emoji: MOOD_EMOJI[opt.value],
  }));
  return { options };
}
