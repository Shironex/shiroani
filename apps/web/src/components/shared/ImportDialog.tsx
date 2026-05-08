import { useEffect, useCallback, useRef, useMemo, useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { Upload, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { getSocket, emitWithErrorHandling } from '@/lib/socket';
import {
  ImportExportEvents,
  type ShiroaniExportFormat,
  type ImportRequest,
  type ImportResponse,
  type ImportItemResult,
} from '@shiroani/shared';
import { useDialogStateMachine } from '@/hooks/useDialogStateMachine';

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'library' | 'diary' | 'all';
}

type ImportStep =
  | { step: 'idle' }
  | { step: 'loading-file' }
  | { step: 'file-error'; message: string }
  | { step: 'preview'; data: ShiroaniExportFormat; libraryCount: number; diaryCount: number }
  | { step: 'importing'; items: ImportItemResult[]; totalCount: number }
  | { step: 'done'; result: ImportResponse };

export function ImportDialog({ open, onOpenChange, type }: ImportDialogProps) {
  const { t } = useTranslation('nav');
  const { state, transition, reset, updateState } = useDialogStateMachine<ImportStep>({
    step: 'idle',
  });
  const [strategy, setStrategy] = useState<'skip' | 'overwrite'>('skip');
  const listenerCleanupRef = useRef<(() => void) | null>(null);

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

  // Auto-start file selection when opened
  if (open && state.step === 'idle') {
    handleFileSelect();
  }

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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        onPointerDownOutside={isImporting ? e => e.preventDefault() : undefined}
        onEscapeKeyDown={isImporting ? e => e.preventDefault() : undefined}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            {t('importDialog.title')}
          </DialogTitle>
          <DialogDescription>{t('importDialog.description')}</DialogDescription>
        </DialogHeader>

        <div className="py-2">
          {/* Loading file */}
          {state.step === 'loading-file' && (
            <div className="flex items-center justify-center gap-3 py-6 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">{t('importDialog.loading')}</span>
            </div>
          )}

          {/* File error */}
          {state.step === 'file-error' && (
            <div className="flex flex-col items-center gap-3 py-4">
              <AlertCircle className="w-8 h-8 text-red-400" />
              <p className="text-sm text-red-400 text-center">{state.message}</p>
            </div>
          )}

          {/* Preview & config */}
          {state.step === 'preview' && (
            <div className="space-y-4">
              <div className="bg-accent/30 rounded-lg p-3">
                <p className="text-sm text-foreground">
                  <Trans
                    i18nKey="importDialog.found"
                    t={t}
                    values={{ library: state.libraryCount, diary: state.diaryCount }}
                    components={{ 1: <span className="font-semibold" /> }}
                  />
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">
                  {t('importDialog.duplicatesPrompt')}
                </p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="strategy"
                    checked={strategy === 'skip'}
                    onChange={() => setStrategy('skip')}
                    className="accent-primary"
                  />
                  <span className="text-sm text-muted-foreground">{t('importDialog.skip')}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="strategy"
                    checked={strategy === 'overwrite'}
                    onChange={() => setStrategy('overwrite')}
                    className="accent-primary"
                  />
                  <span className="text-sm text-muted-foreground">
                    {t('importDialog.overwrite')}
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Importing - progress bar with current item */}
          {state.step === 'importing' && progressInfo && (
            <div className="space-y-4 py-2">
              {/* Header with spinner */}
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-primary animate-spin shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {t('importDialog.importing')}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t('importDialog.progress', {
                      completed: progressInfo.completed,
                      total: state.totalCount,
                    })}
                  </p>
                </div>
                <span className="text-sm font-semibold text-primary tabular-nums shrink-0">
                  {progressInfo.percent}%
                </span>
              </div>

              {/* Progress bar */}
              <ProgressBar value={progressInfo.percent} thickness={8} />

              {/* Current item being processed */}
              {progressInfo.currentItem && (
                <div className="bg-accent/20 rounded-lg px-3 py-2">
                  <p className="text-xs text-muted-foreground truncate">
                    {progressInfo.currentItem.title}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Done - summary */}
          {state.step === 'done' && (
            <div className="space-y-3 py-2">
              <div className="flex items-center justify-center gap-2 py-2">
                <CheckCircle className="w-6 h-6 text-green-400" />
                <span className="text-sm font-medium text-foreground">
                  {t('importDialog.done')}
                </span>
              </div>
              <div className="flex items-center justify-center gap-4 text-sm">
                <span className="text-green-400">
                  {t('importDialog.imported', { count: state.result.totalImported })}
                </span>
                {state.result.totalSkipped > 0 && (
                  <span className="text-yellow-400">
                    {t('importDialog.skipped', { count: state.result.totalSkipped })}
                  </span>
                )}
                {state.result.totalErrors > 0 && (
                  <span className="text-red-400">
                    {t('importDialog.errors', { count: state.result.totalErrors })}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {state.step === 'preview' && (
            <Button onClick={handleImport}>
              <Upload className="w-4 h-4" />
              {t('importDialog.import')}
            </Button>
          )}
          {state.step === 'file-error' && (
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              {t('importDialog.close')}
            </Button>
          )}
          {state.step === 'done' && (
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              {t('importDialog.close')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
