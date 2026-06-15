import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { useSliderInputField } from './SliderInputField.hooks';
import type { ISliderInputFieldProps } from './SliderInputField.types';

export default function SliderInputField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  showSlider = true,
  disabled,
}: ISliderInputFieldProps) {
  const { labelId } = useSliderInputField();
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label id={labelId} className="text-xs font-medium text-muted-foreground">
          {label}
        </label>
        <Input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={e => onChange(Math.max(min, Math.min(max, parseInt(e.target.value, 10) || 0)))}
          className="w-16 h-7 text-xs text-center"
          aria-labelledby={labelId}
          disabled={disabled}
        />
      </div>
      {showSlider && (
        <Slider
          value={[value]}
          onValueChange={v => onChange(v[0])}
          min={min}
          max={max}
          step={step}
          aria-labelledby={labelId}
          disabled={disabled}
        />
      )}
    </div>
  );
}
