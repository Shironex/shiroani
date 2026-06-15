export interface ISliderInputFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  /** Whether to show the slider (hidden when max is unknown) */
  showSlider?: boolean;
  disabled?: boolean;
}

export interface ISliderInputFieldView {
  readonly labelId: string;
}
