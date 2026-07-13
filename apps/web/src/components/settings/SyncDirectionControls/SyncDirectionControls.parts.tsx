import { useRef, type KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';
import { selectableChip } from '@/components/settings/chip-styles';

export interface RadioOption<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

export interface OptionRadioGroupProps<T extends string> {
  options: readonly RadioOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  orientation?: 'horizontal' | 'vertical';
  disabled?: boolean;
  className?: string;
}

/**
 * Accessible radiogroup shared by the direction-mode selector (horizontal, label
 * only) and the push-semantics choice (vertical, label + hint). Mirrors
 * {@link DockEdgePicker}'s WAI-ARIA APG keyboard model: arrows move (with wrap)
 * the checked radio and shift focus to it.
 *
 * Lives in `.parts.tsx` (exempt from the component-architecture rules) because
 * it owns a `useRef` for roving focus and a local `.map` in render.
 */
export function OptionRadioGroup<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  orientation = 'horizontal',
  disabled = false,
  className,
}: OptionRadioGroupProps<T>) {
  const radioRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function move(delta: number) {
    const currentIndex = options.findIndex(o => o.value === value);
    const nextIndex = (currentIndex + delta + options.length) % options.length;
    onChange(options[nextIndex].value);
    radioRefs.current[nextIndex]?.focus();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      move(1);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      move(-1);
    }
  }

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      aria-orientation={orientation}
      className={cn(
        orientation === 'horizontal' ? 'grid grid-cols-3 gap-1.5' : 'flex flex-col gap-1.5',
        className
      )}
    >
      {options.map((option, index) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            ref={el => {
              radioRefs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            onKeyDown={handleKeyDown}
            className={cn(
              'rounded-lg border disabled:pointer-events-none disabled:opacity-50',
              'transition-[color,background-color,border-color,transform] active:scale-[0.98]',
              'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
              orientation === 'horizontal'
                ? 'px-3 py-[7px] text-center text-[12px] font-medium'
                : 'px-3 py-2 text-left',
              selectableChip(active)
            )}
          >
            <span className={cn('block text-[12px]', active ? 'font-semibold' : 'font-medium')}>
              {option.label}
            </span>
            {option.hint && (
              <span className="mt-0.5 block text-[11px] font-normal text-muted-foreground">
                {option.hint}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
