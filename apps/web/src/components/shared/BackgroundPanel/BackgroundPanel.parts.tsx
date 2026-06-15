import { Slider } from '@/components/ui/slider';

interface OnboardingSliderRowProps {
  label: string;
  value: number;
  max: number;
  step: number;
  display: string;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export function OnboardingSliderRow({
  label,
  value,
  max,
  step,
  display,
  onChange,
  disabled,
}: OnboardingSliderRowProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border-glass bg-foreground/[0.02] px-3 py-2.5">
      <b className="min-w-[92px] text-xs font-semibold text-foreground">{label}</b>
      <Slider
        value={[value]}
        onValueChange={([next]) => onChange(next ?? 0)}
        min={0}
        max={max}
        step={step}
        disabled={disabled}
        aria-label={label}
        className="flex-1"
      />
      <span className="min-w-[36px] text-right font-mono text-[10.5px] font-semibold text-primary">
        {display}
      </span>
    </div>
  );
}
