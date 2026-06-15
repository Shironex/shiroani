import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { emitWithErrorHandling } from '@/lib/socket';
import { ImportExportEvents, type ExportRequest, type ExportResponse } from '@shiroani/shared';
import { useDialogStateMachine } from '@/hooks/useDialogStateMachine';
import type { IExportDialogProps, IExportDialogView, ExportState } from './ExportDialog.types';

const EXPORT_FILENAME: Record<string, string> = {
  library: 'shiroani_library.json',
  diary: 'shiroani_diary.json',
  all: 'shiroani_all.json',
};

type IUseExportDialogArgs = Pick<
  IExportDialogProps,
  'open' | 'onOpenChange' | 'type' | 'selectedIds'
>;

export function useExportDialog({
  open,
  onOpenChange,
  type,
  selectedIds,
}: IUseExportDialogArgs): IExportDialogView {
  const { t } = useTranslation('nav');
  const { state, transition, reset } = useDialogStateMachine<ExportState>({ step: 'idle' });
  // Guards the auto-trigger against StrictMode's double-mount so the export
  // fires exactly once per open session. Reset when the dialog closes.
  const autoTriggeredRef = useRef(false);

  const handleExport = useCallback(async () => {
    transition({ step: 'loading' });
    try {
      const response = await emitWithErrorHandling<ExportRequest, ExportResponse>(
        ImportExportEvents.EXPORT,
        { type, ids: selectedIds }
      );
      transition({ step: 'success', data: response });
    } catch (err) {
      transition({
        step: 'error',
        message: err instanceof Error ? err.message : t('exportDialog.errors.unknown'),
      });
    }
  }, [type, selectedIds, transition, t]);

  const handleSave = useCallback(async () => {
    if (state.step !== 'success') return;

    const { data } = state;
    transition({ step: 'saving' });

    try {
      const filePath = await window.electronAPI?.dialog?.saveFile?.({
        title: t('exportDialog.saveDialogTitle'),
        defaultPath: EXPORT_FILENAME[type] ?? 'shiroani_export.json',
        filters: [{ name: 'JSON', extensions: ['json'] }],
      });

      if (!filePath) {
        // User cancelled — go back to success state
        transition({ step: 'success', data });
        return;
      }

      await window.electronAPI?.file?.writeJson(filePath, JSON.stringify(data.data, null, 2));
      transition({ step: 'saved' });
    } catch (err) {
      transition({
        step: 'save-error',
        message: err instanceof Error ? err.message : t('exportDialog.errors.saveFailed'),
      });
    }
  }, [state, transition, t, type]);

  const handleOpenChange = useCallback(
    (value: boolean) => {
      if (!value) {
        reset();
      }
      onOpenChange(value);
    },
    [onOpenChange, reset]
  );

  // Auto-start export when opened. Single trigger path (the previous
  // render-phase call + onOpenAutoFocus duplicated this) moved into an effect
  // so the async side-effect isn't run during render; the ref guard keeps it
  // single-fire under StrictMode's double mount.
  useEffect(() => {
    if (!open) {
      autoTriggeredRef.current = false;
      return;
    }
    if (state.step === 'idle' && !autoTriggeredRef.current) {
      autoTriggeredRef.current = true;
      handleExport();
    }
  }, [open, state.step, handleExport]);

  return { state, handleSave, handleOpenChange };
}
