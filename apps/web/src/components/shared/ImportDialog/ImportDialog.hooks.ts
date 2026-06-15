import { useEffect, useCallback, useRef, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getSocket, emitWithErrorHandling } from '@/lib/socket';
import {
  ImportExportEvents,
  type ShiroaniExportFormat,
  type ImportRequest,
  type ImportResponse,
  type ImportItemResult,
} from '@shiroani/shared';
import { useDialogStateMachine } from '@/hooks/useDialogStateMachine';
import type {
  IImportDialogProps,
  IImportDialogView,
  ImportStep,
  ImportStrategy,
} from './ImportDialog.types';

type IUseImportDialogArgs = Pick<IImportDialogProps, 'open' | 'onOpenChange' | 'type'>;

export function useImportDialog({
  open,
  onOpenChange,
  type,
}: IUseImportDialogArgs): IImportDialogView {
  const { t } = useTranslation('nav');
  const { state, transition, reset, updateState } = useDialogStateMachine<ImportStep>({
    step: 'idle',
  });
  const [strategy, setStrategy] = useState<ImportStrategy>('skip');
  const listenerCleanupRef = useRef<(() => void) | null>(null);
  // Guards the auto-trigger against StrictMode's double-mount: the file dialog
  // must open exactly once per `open` session, before any state transition has
  // a chance to settle. Reset when the dialog closes.
  const autoTriggeredRef = useRef(false);

  // Clean up socket listener on unmount
  useEffect(() => {
    return () => {
      listenerCleanupRef.current?.();
    };
  }, []);

  const handleFileSelect = useCallback(async () => {
    transition({ step: 'loading-file' });

    try {
      const filePath = await window.electronAPI?.dialog?.openFile?.({
        title: t('importDialog.openDialogTitle'),
        filters: [{ name: 'JSON', extensions: ['json'] }],
      });

      if (!filePath) {
        reset();
        onOpenChange(false);
        return;
      }

      const raw = await window.electronAPI?.file?.readJson(filePath);

      if (!raw) {
        transition({ step: 'file-error', message: t('importDialog.errorMessages.readFailed') });
        return;
      }

      let data: ShiroaniExportFormat;
      try {
        data = JSON.parse(raw);
      } catch {
        transition({ step: 'file-error', message: t('importDialog.errorMessages.invalidJson') });
        return;
      }

      if (data.source !== 'shiroani' || data.version !== 1) {
        transition({
          step: 'file-error',
          message: t('importDialog.errorMessages.notShiroaniExport'),
        });
        return;
      }

      const libraryCount = data.data?.library?.length ?? 0;
      const diaryCount = data.data?.diary?.length ?? 0;

      transition({ step: 'preview', data, libraryCount, diaryCount });
    } catch (err) {
      transition({
        step: 'file-error',
        message: err instanceof Error ? err.message : t('importDialog.errorMessages.unknown'),
      });
    }
  }, [onOpenChange, transition, reset, t]);

  const handleImport = useCallback(async () => {
    if (state.step !== 'preview') return;

    const { data } = state;

    // Build initial items list
    const initialItems: ImportItemResult[] = [];
    let idx = 0;

    if (data.data?.library) {
      for (const entry of data.data.library) {
        initialItems.push({
          index: idx++,
          title: (entry as { title?: string }).title ?? `Anime #${idx}`,
          status: 'pending',
        });
      }
    }

    if (data.data?.diary) {
      for (const entry of data.data.diary) {
        initialItems.push({
          index: idx++,
          title: (entry as { title?: string }).title ?? `Wpis #${idx}`,
          status: 'pending',
        });
      }
    }

    const totalCount = initialItems.length;
    transition({ step: 'importing', items: [...initialItems], totalCount });

    // Listen for progress updates
    const socket = getSocket();
    const handleProgress = (progress: ImportItemResult) => {
      updateState(prev => {
        if (prev.step !== 'importing') return prev;
        const updated = (prev as Extract<ImportStep, { step: 'importing' }>).items.map(item =>
          item.index === progress.index ? { ...item, ...progress } : item
        );
        return { ...prev, items: updated } as ImportStep;
      });
    };

    socket.on(ImportExportEvents.IMPORT_PROGRESS, handleProgress);
    listenerCleanupRef.current = () => {
      socket.off(ImportExportEvents.IMPORT_PROGRESS, handleProgress);
    };

    try {
      const response = await emitWithErrorHandling<ImportRequest, ImportResponse>(
        ImportExportEvents.IMPORT,
        { type, data, strategy },
        { timeout: 300000 }
      );

      await new Promise(resolve => setTimeout(resolve, 800));
      transition({ step: 'done', result: response });
    } catch (err) {
      transition({
        step: 'file-error',
        message: err instanceof Error ? err.message : t('importDialog.errorMessages.importFailed'),
      });
    } finally {
      socket.off(ImportExportEvents.IMPORT_PROGRESS, handleProgress);
      listenerCleanupRef.current = null;
    }
  }, [state, type, strategy, transition, updateState, t]);

  const handleOpenChange = useCallback(
    (value: boolean) => {
      if (state.step === 'importing' && !value) return;

      if (!value) {
        listenerCleanupRef.current?.();
        listenerCleanupRef.current = null;
        reset();
      }
      onOpenChange(value);
    },
    [onOpenChange, state.step, reset]
  );

  // Auto-start file selection when opened. Runs as an effect (not in render)
  // so the async side-effect is StrictMode-safe — the ref guard ensures the
  // file dialog fires exactly once per open session even though the first
  // `transition` away from 'idle' hasn't settled yet on the double mount.
  useEffect(() => {
    if (!open) {
      autoTriggeredRef.current = false;
      return;
    }
    if (state.step === 'idle' && !autoTriggeredRef.current) {
      autoTriggeredRef.current = true;
      handleFileSelect();
    }
  }, [open, state.step, handleFileSelect]);

  // Compute progress stats for the importing step
  const progressInfo = useMemo(() => {
    if (state.step !== 'importing') return null;
    const completed = state.items.filter(
      i => i.status === 'success' || i.status === 'skipped' || i.status === 'error'
    ).length;
    const currentItem = state.items.find(i => i.status === 'processing');
    const percent = state.totalCount > 0 ? Math.round((completed / state.totalCount) * 100) : 0;
    return { completed, currentItem, percent };
  }, [state]);

  const isImporting = state.step === 'importing';

  return {
    state,
    strategy,
    setStrategy,
    handleImport,
    handleOpenChange,
    progressInfo,
    isImporting,
  };
}
