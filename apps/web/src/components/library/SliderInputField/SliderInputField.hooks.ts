import { useId } from 'react';
import type { ISliderInputFieldView } from './SliderInputField.types';

export function useSliderInputField(): ISliderInputFieldView {
  const labelId = useId();
  return { labelId };
}
