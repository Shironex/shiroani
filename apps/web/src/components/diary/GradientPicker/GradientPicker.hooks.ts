import { useTranslation } from 'react-i18next';
import { DIARY_GRADIENTS } from '@/lib/diary-constants';
import { tDynamic } from '@/lib/i18n';
import type { DiaryGradient } from '@shiroani/shared';
import type { IGradientPickerView, IGradientSwatch } from './GradientPicker.types';

export function useGradientPicker(): IGradientPickerView {
  const { t, i18n } = useTranslation('diary');
  const swatches: IGradientSwatch[] = Object.entries(DIARY_GRADIENTS).map(
    ([key, { labelKey, css }]) => ({
      key: key as DiaryGradient,
      label: tDynamic(i18n, `diary:${labelKey}`),
      css,
    })
  );
  return {
    eyebrow: t('editor.cover'),
    clearLabel: t('gradient.clear'),
    swatches,
  };
}
