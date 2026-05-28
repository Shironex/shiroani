import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Download, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDialogStateMachine } from '@/hooks/useDialogStateMachine';
import { wipeAllData } from '@/lib/wipe-all-data';
import { confirmKeywordMatches } from '@/lib/confirm-keyword';
import { createLogger } from '@shiroani/shared';

const logger = createLogger('DeleteAllDataDialog');

interface DeleteAllDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Close this dialog and open the export-all flow, so the user can back up first. */
  onExportFirst: () => void;
}

type WipeState = { step: 'idle' } | { step: 'wiping' } | { step: 'error'; message: string };

/**
 * Type-to-confirm dialog for the irreversible "delete all data" factory reset.
 *
 * Deliberately stronger than the shared {@link ConfirmDialog} (a single
 * are-you-sure step): the user must type the confirmation keyword before the
 * destructive button enables. On confirm it runs {@link wipeAllData}, which —
 * on success — relaunches the app, so this component simply unmounts; only the
 * failure path returns control here.
 */
export function DeleteAllDataDialog({
  open,
  onOpenChange,
  onExportFirst,
}: DeleteAllDataDialogProps) {
  const { t } = useTranslation('settings');
  const { state, transition, reset } = useDialogStateMachine<WipeState>({ step: 'idle' });
  const [input, setInput] = useState('');
  const inputId = useId();
  const errorId = `${inputId}-error`;
  // Synchronous in-flight latch: `isWiping` is closed over per render, so a
  // same-tick double-fire (rapid Enter + click) could slip past the state check.
  // The ref guarantees the wipe runs at most once per dialog session.
  const wipingRef = useRef(false);

  const keyword = t('data.danger.confirm.keyword');
  const matches = confirmKeywordMatches(input, keyword);
  const isWiping = state.step === 'wiping';
  const hasError = state.step === 'error';

  // Reset on every close, regardless of path — covers Radix dismissal, Cancel,
  // AND the parent-driven "export first" close (which bypasses handleOpenChange),
  // so a stale typed keyword never carries over to the next open.
  useEffect(() => {
    if (!open) {
      reset();
      setInput('');
      wipingRef.current = false;
    }
  }, [open, reset]);

  const handleOpenChange = useCallback(
    (value: boolean) => {
      // Don't let an outside-click / Esc dismiss the dialog mid-wipe.
      if (!value && isWiping) return;
      onOpenChange(value);
    },
    [isWiping, onOpenChange]
  );

  const handleConfirm = useCallback(async () => {
    if (!matches || wipingRef.current) return;
    wipingRef.current = true;
    transition({ step: 'wiping' });
    try {
      await wipeAllData();
      // Success → the app relaunches (desktop) / reloads (web); this component
      // unmounts before reaching here. Nothing to do.
    } catch (err) {
      logger.error('wipeAllData failed', err);
      wipingRef.current = false;
      transition({ step: 'error', message: t('data.danger.confirm.error') });
    }
  }, [matches, transition, t]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            {t('data.danger.confirm.title')}
          </DialogTitle>
          <DialogDescription>{t('data.danger.confirm.description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-[12px] leading-relaxed text-destructive">
            {t('data.danger.confirm.warning')}
          </div>

          <div className="space-y-1.5">
            <label htmlFor={inputId} className="text-[12.5px] font-medium text-foreground">
              {t('data.danger.confirm.inputLabel', { keyword })}
            </label>
            <Input
              id={inputId}
              value={input}
              autoFocus
              autoComplete="off"
              spellCheck={false}
              disabled={isWiping}
              placeholder={keyword}
              aria-invalid={hasError}
              aria-describedby={hasError ? errorId : undefined}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && matches && !isWiping) {
                  e.preventDefault();
                  void handleConfirm();
                }
              }}
            />
          </div>

          {hasError && (
            <p id={errorId} role="alert" className="text-[12px] text-destructive">
              {state.message}
            </p>
          )}
        </div>

        <DialogFooter className="sm:justify-between">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={isWiping}
            onClick={onExportFirst}
          >
            <Download className="h-4 w-4" />
            {t('data.danger.confirm.exportFirst')}
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={isWiping}
              onClick={() => handleOpenChange(false)}
            >
              {t('data.danger.confirm.cancel')}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="gap-2"
              disabled={!matches || isWiping}
              onClick={handleConfirm}
            >
              {isWiping && <Loader2 className="h-4 w-4 animate-spin" />}
              {isWiping ? t('data.danger.confirm.wiping') : t('data.danger.confirm.confirm')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
