import { useId } from 'react';
import { Switch } from '@/components/ui/switch';

/**
 * Small toggle row for template options. The label is a real `<label htmlFor>`
 * bound to the Switch (so the whole caption is a click target and matches the
 * SettingsToggleRow interaction model) with typography aligned to the rest of
 * the settings rows.
 */
export function TemplateToggle({
  icon: Icon,
  label,
  checked,
  onChange,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="flex items-center justify-between py-1">
      <label
        htmlFor={id}
        className="flex cursor-pointer items-center gap-2 text-[13px] text-foreground"
      >
        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
        {label}
      </label>
      <Switch id={id} aria-label={label} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
