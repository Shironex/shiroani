import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { MOOD_EMOJI, MOOD_OPTIONS } from '@/lib/diary-constants';
import type { DiaryMood } from '@shiroani/shared';

interface MoodPickerPillsProps {
  value: DiaryMood | undefined;
  onChange: (next: DiaryMood | undefined) => void;
  /**
   * `sm` — sidebar pill with emoji + label (rounded-full, bordered).
   * `xs` — compact toolbar tile with emoji only (fades inactive).
   */
  size: 'sm' | 'xs';
  className?: string;
}

/**
 * Shared mood picker used in the diary editor's left rail (labelled pills)
 * and toolbar (emoji-only tiles). Toggling the active mood clears it.
 */
export function MoodPickerPills({ value, onChange, size, className }: MoodPickerPillsProps) {
  const { t } = useTranslation('diary');
  return (
    <div
      className={cn(
        size === 'sm' ? 'flex flex-wrap gap-1.5' : 'flex items-center gap-1',
        className
      )}
    >
      {MOOD_OPTIONS.map(opt => {
        const active = value === opt.value;
        const handleClick = () => onChange(active ? undefined : opt.value);
        const label = t(opt.labelKey);
        if (size === 'sm') {
          return (
            <button
              key={opt.value}
              type="button"
              onClick={handleClick}
              title={label}
              aria-pressed={active}
              aria-label={label}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1',
                'text-[11px] transition-colors',
                active
                  ? 'border-primary/40 bg-primary/15 text-primary'
                  : 'border-border-glass bg-foreground/[0.03] text-foreground/80 hover:text-foreground'
              )}
            >
              <span aria-hidden="true">{MOOD_EMOJI[opt.value]}</span>
              <span>{label}</span>
            </button>
          );
        }
        return (
          <button
            key={opt.value}
            type="button"
            onClick={handleClick}
            title={label}
            aria-label={label}
            aria-pressed={active}
            className={cn(
              'rounded-[6px] px-1.5 py-0.5 text-[14px] leading-none transition-all',
              active ? 'bg-primary/15 opacity-100' : 'opacity-40 hover:opacity-80'
            )}
          >
            {MOOD_EMOJI[opt.value]}
          </button>
        );
      })}
    </div>
  );
}
