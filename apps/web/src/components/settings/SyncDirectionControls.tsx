import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { tDynamic } from '@/lib/i18n';
import type { FullSyncDirection, FullSyncPushMode } from '@shiroani/shared';

/** Provider whose i18n keys (`anilist.*` / `mal.*`) back the labels. */
type SyncProvider = 'anilist' | 'mal';

/** The three full-library directions, in display order. */
const DIRECTION_MODES: readonly FullSyncDirection[] = ['two-way', 'push', 'pull'];

/** The two push semantics, in display order (safe option first). */
const PUSH_MODES: readonly FullSyncPushMode[] = ['create-missing', 'overwrite'];

/** Map a hyphenated enum value to its camelCase i18n key segment. */
function modeKey(mode: FullSyncDirection): string {
  return mode === 'two-way' ? 'twoWay' : mode;
}
function pushModeKey(mode: FullSyncPushMode): string {
  return mode === 'create-missing' ? 'createMissing' : 'overwrite';
}

interface RadioOption<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

interface OptionRadioGroupProps<T extends string> {
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
 */
function OptionRadioGroup<T extends string>({
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
              'rounded-lg border transition-colors disabled:pointer-events-none disabled:opacity-50',
              'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
              orientation === 'horizontal'
                ? 'px-3 py-[7px] text-center text-[12px] font-medium'
                : 'px-3 py-2 text-left',
              active
                ? 'border-primary/35 bg-primary/18 text-primary'
                : 'border-border-glass bg-background/30 text-muted-foreground hover:bg-accent/40 hover:text-foreground'
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

interface SyncModeSelectorProps {
  provider: SyncProvider;
  value: FullSyncDirection;
  onChange: (mode: FullSyncDirection) => void;
  disabled?: boolean;
}

/**
 * Persisted direction-mode selector for a provider's sync card. Picks how the
 * "Sync now" button (and any recurring run) behaves: two-way / push-only /
 * pull-only. Renders the active mode's one-line hint underneath.
 */
export function SyncModeSelector({ provider, value, onChange, disabled }: SyncModeSelectorProps) {
  const { i18n } = useTranslation('accounts');
  // Keys are built from a runtime `provider` prefix, so they go through tDynamic
  // (the codebase's escape hatch for runtime-derived keys; static `t` rejects them).
  const tr = (key: string) => tDynamic(i18n, `accounts:${key}`);
  const options: RadioOption<FullSyncDirection>[] = DIRECTION_MODES.map(mode => ({
    value: mode,
    label: tr(`${provider}.sync.mode.${modeKey(mode)}.label`),
  }));

  return (
    <div className="space-y-1.5">
      <p className="text-[11.5px] font-medium text-muted-foreground">
        {tr(`${provider}.sync.mode.groupLabel`)}
      </p>
      <OptionRadioGroup
        options={options}
        value={value}
        onChange={onChange}
        ariaLabel={tr(`${provider}.sync.mode.groupLabel`)}
        disabled={disabled}
      />
      <p className="text-[11px] text-muted-foreground">
        {tr(`${provider}.sync.mode.${modeKey(value)}.hint`)}
      </p>
    </div>
  );
}

interface PushLibraryButtonProps {
  provider: SyncProvider;
  onPush: (mode: FullSyncPushMode) => void;
  disabled?: boolean;
}

/**
 * One-shot "push the whole library" action. Opens a dialog to choose
 * create-missing vs overwrite (overwrite is write-heavy, so it's gated behind the
 * dialog with a rate-limit caveat) then calls {@link onPush}. Never pulls.
 */
export function PushLibraryButton({ provider, onPush, disabled }: PushLibraryButtonProps) {
  const { i18n } = useTranslation('accounts');
  const tr = (key: string) => tDynamic(i18n, `accounts:${key}`);
  const [open, setOpen] = useState(false);
  // Default to the non-destructive option every time the dialog opens.
  const [pushMode, setPushMode] = useState<FullSyncPushMode>('create-missing');
  // Announce BOTH the description and the safety warning when the dialog opens —
  // the rate-limit/overwrite caveat is the most consequential text here.
  const descId = useId();
  const warningId = useId();

  const pushOptions: RadioOption<FullSyncPushMode>[] = PUSH_MODES.map(mode => ({
    value: mode,
    label: tr(`${provider}.sync.push.mode.${pushModeKey(mode)}.label`),
    hint: tr(`${provider}.sync.push.mode.${pushModeKey(mode)}.hint`),
  }));

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        disabled={disabled}
        onClick={() => {
          setPushMode('create-missing');
          setOpen(true);
        }}
        className="flex-shrink-0"
      >
        <Upload className="size-4" />
        {tr(`${provider}.sync.push.button`)}
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent aria-describedby={`${descId} ${warningId}`}>
          <AlertDialogHeader>
            <AlertDialogTitle>{tr(`${provider}.sync.push.dialogTitle`)}</AlertDialogTitle>
            <AlertDialogDescription id={descId}>
              {tr(`${provider}.sync.push.dialogDescription`)}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <OptionRadioGroup
            options={pushOptions}
            value={pushMode}
            onChange={setPushMode}
            ariaLabel={tr(`${provider}.sync.push.dialogTitle`)}
            orientation="vertical"
          />

          <div
            id={warningId}
            className="flex items-start gap-2 rounded-lg border border-border-glass bg-foreground/[0.03] px-3 py-2 text-[11.5px] text-muted-foreground"
          >
            <AlertTriangle className="mt-0.5 size-3.5 flex-shrink-0 text-[oklch(0.78_0.12_75)]" />
            <span>{tr(`${provider}.sync.push.warning`)}</span>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>{tr(`${provider}.sync.push.cancel`)}</AlertDialogCancel>
            <Button
              onClick={() => {
                setOpen(false);
                onPush(pushMode);
              }}
            >
              {tr(`${provider}.sync.push.confirm`)}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
