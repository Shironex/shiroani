import type { RefObject } from 'react';

export interface IColorPickerFieldProps {
  label: string;
  variableName: string;
  /** oklch value */
  value: string;
  onChange: (value: string) => void;
}

export interface IColorPickerFieldView {
  readonly colorInputRef: RefObject<HTMLInputElement | null>;
  readonly hexValue: string;
  readonly localHex: string;
  readonly handleHexChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  readonly handleColorPickerChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}
