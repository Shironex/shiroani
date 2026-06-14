import { cn } from '@/lib/utils';
import type { DiaryMood } from '@shiroani/shared';
import type { IMoodOption } from './MoodPickerPills.types';

interface IMoodPillsProps {
  options: IMoodOption[];
  value: DiaryMood | undefined;
  onChange: (next: DiaryMood | undefined) => void;
  size: 'sm' | 'xs';
}

/** The list of mood buttons — labelled pills (`sm`) or emoji-only tiles (`xs`). */
export function MoodPills({ options, value, onChange, size }: IMoodPillsProps) {
  return (
    <>
      {options.map(opt => {
        const active = value === opt.value;
        const handleClick = () => onChange(active ? undefined : opt.value);
        if (size === 'sm') {
          return (
            <button
              key={opt.value}
              type="button"
              onClick={handleClick}
              title={opt.label}
              aria-pressed={active}
              aria-label={opt.label}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1',
                'text-[11px] transition-colors',
                active
                  ? 'border-primary/40 bg-primary/15 text-primary'
                  : 'border-border-glass bg-foreground/[0.03] text-foreground/80 hover:text-foreground'
              )}
            >
              <span aria-hidden="true">{opt.emoji}</span>
              <span>{opt.label}</span>
            </button>
          );
        }
        return (
          <button
            key={opt.value}
            type="button"
            onClick={handleClick}
            title={opt.label}
            aria-label={opt.label}
            aria-pressed={active}
            className={cn(
              'rounded-[6px] px-1.5 py-0.5 text-[14px] leading-none transition-all',
              active ? 'bg-primary/15 opacity-100' : 'opacity-40 hover:opacity-80'
            )}
          >
            {opt.emoji}
          </button>
        );
      })}
    </>
  );
}
