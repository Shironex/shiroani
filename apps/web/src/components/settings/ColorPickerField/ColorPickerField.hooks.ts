import { useCallback, useEffect, useRef, useState } from 'react';
import { oklchToHex, hexToOklch, isValidHexColor } from '@/lib/color-utils';
import type { IColorPickerFieldProps, IColorPickerFieldView } from './ColorPickerField.types';

export function useColorPickerField({
  value,
  onChange,
}: IColorPickerFieldProps): IColorPickerFieldView {
  const colorInputRef = useRef<HTMLInputElement>(null);
  const hexValue = value ? oklchToHex(value) : '#000000';
  const [localHex, setLocalHex] = useState(hexValue);

  useEffect(() => setLocalHex(hexValue), [hexValue]);

  const handleHexChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const hex = e.target.value;
      setLocalHex(hex);
      if (isValidHexColor(hex)) {
        onChange(hexToOklch(hex));
      }
    },
    [onChange]
  );

  const handleColorPickerChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(hexToOklch(e.target.value));
    },
    [onChange]
  );

  return { colorInputRef, hexValue, localHex, handleHexChange, handleColorPickerChange };
}
