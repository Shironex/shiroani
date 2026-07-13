import { cn } from '@/lib/utils';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
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
              aria-pressed={active}
              aria-label={opt.label}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1',
                'text-[11px] transition-colors active:scale-95',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
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
          <Tooltip key={opt.value}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={handleClick}
                aria-label={opt.label}
                aria-pressed={active}
                className={cn(
                  'rounded-sm px-1.5 py-0.5 text-[14px] leading-none active:scale-95',
                  'transition-[opacity,background-color]',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  active ? 'bg-primary/15 opacity-100' : 'opacity-60 hover:opacity-100'
                )}
              >
                {opt.emoji}
              </button>
            </TooltipTrigger>
            <TooltipContent>{opt.label}</TooltipContent>
          </Tooltip>
        );
      })}
    </>
  );
}
