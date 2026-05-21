import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';

interface SliderInputFieldProps {
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

export function SliderInputField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  showSlider = true,
  disabled,
}: SliderInputFieldProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-muted-foreground">{label}</label>
        <Input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={e => onChange(Math.max(min, Math.min(max, parseInt(e.target.value, 10) || 0)))}
          className="w-16 h-7 text-xs text-center"
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
          disabled={disabled}
        />
      )}
    </div>
  );
}
