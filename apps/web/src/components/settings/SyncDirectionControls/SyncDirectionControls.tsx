import { useId } from 'react';
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
import { tDynamic } from '@/lib/i18n';
import type { FullSyncDirection, FullSyncPushMode } from '@shiroani/shared';
import { OptionRadioGroup, type RadioOption } from './SyncDirectionControls.parts';
import { usePushLibraryButton } from './SyncDirectionControls.hooks';
import type {
  IPushLibraryButtonProps,
  ISyncModeSelectorProps,
} from './SyncDirectionControls.types';

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

/**
 * Persisted direction-mode selector for a provider's sync card. Picks how the
 * "Sync now" button (and any recurring run) behaves: two-way / push-only /
 * pull-only. Renders the active mode's one-line hint underneath.
 */
export default function SyncModeSelector({
  provider,
  value,
  onChange,
  disabled,
}: ISyncModeSelectorProps) {
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

/**
 * One-shot "push the whole library" action. Opens a dialog to choose
 * create-missing vs overwrite (overwrite is write-heavy, so it's gated behind the
 * dialog with a rate-limit caveat) then calls {@link onPush}. Never pulls.
 */
export function PushLibraryButton({ provider, onPush, disabled }: IPushLibraryButtonProps) {
  const { i18n } = useTranslation('accounts');
  const tr = (key: string) => tDynamic(i18n, `accounts:${key}`);
  const { open, setOpen, pushMode, setPushMode } = usePushLibraryButton();
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
