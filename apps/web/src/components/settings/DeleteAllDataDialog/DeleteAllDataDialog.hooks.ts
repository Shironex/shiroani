import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDialogStateMachine } from '@/hooks/useDialogStateMachine';
import { wipeAllData } from '@/lib/wipe-all-data';
import { confirmKeywordMatches } from '@/lib/confirm-keyword';
import { createLogger } from '@shiroani/shared';
import type {
  IDeleteAllDataDialogProps,
  IDeleteAllDataDialogView,
  WipeState,
} from './DeleteAllDataDialog.types';

const logger = createLogger('DeleteAllDataDialog');

export function useDeleteAllDataDialog({
  open,
  onOpenChange,
}: IDeleteAllDataDialogProps): IDeleteAllDataDialogView {
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

  return {
    state,
    input,
    setInput,
    matches,
    isWiping,
    hasError,
    inputId,
    errorId,
    keyword,
    handleOpenChange,
    handleConfirm,
  };
}
